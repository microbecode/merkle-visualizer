import { keccak_256 } from 'js-sha3';
import { sha256 } from 'js-sha256';
import { blake2bHex } from 'blakejs';
// @ts-expect-error: no types for ripemd160
import RIPEMD160 from 'ripemd160';

export type MerkleNode = {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  isLeaf?: boolean;
  preimage?: string;
};

export type HashFunction = 'keccak' | 'sha256' | 'blake2b' | 'ripemd160';

function hashValue(value: string, fn: HashFunction): string {
  if (fn === 'keccak') return keccak_256(value);
  if (fn === 'sha256') return sha256(value);
  if (fn === 'blake2b') return blake2bHex(value);
  if (fn === 'ripemd160') return new RIPEMD160().update(Buffer.from(value)).digest('hex');
  return value;
}

function hashParentNode(leftHash: string, rightHash: string, fn: HashFunction, combineMethod: 'concat' | 'sum' = 'concat', commutative = false): string {
  let combined: string;
  if (combineMethod === 'sum') {
    // Use BigInt for handling large hex values
    const leftNum = BigInt('0x' + leftHash);
    const rightNum = BigInt('0x' + rightHash);
    combined = (leftNum + rightNum).toString(16);

  } else {
    // Handle commutative option before concatenating
    if (commutative && leftHash !== rightHash) {
      combined = [leftHash, rightHash].sort().join('');
    } else {
      combined = leftHash + rightHash;
    }
  }

  // Convert the combined string to a Buffer treating it as hex
  const buffer = Buffer.from(combined, 'hex');

  if (fn === 'keccak') return keccak_256(buffer);
  if (fn === 'sha256') return sha256(buffer);
  if (fn === 'blake2b') return blake2bHex(buffer);
  if (fn === 'ripemd160') return new RIPEMD160().update(buffer).digest('hex');
  return combined;
}

export function buildMerkleTree(leaves: string[], fn: HashFunction, commutative = false, combineMethod: 'concat' | 'sum' = 'concat'): MerkleNode | null {
  if (leaves.length === 0) return null;
  const leafNodes = leaves.map(preimage => ({
    hash: hashValue(preimage, fn),
    isLeaf: true,
    preimage,
  }));
  return buildTreeLevel(leafNodes, fn, commutative, combineMethod);
}

function buildTreeLevel(nodes: MerkleNode[], fn: HashFunction, commutative = false, combineMethod: 'concat' | 'sum' = 'concat'): MerkleNode {
  if (nodes.length === 1) return nodes[0];
  const nextLevel: MerkleNode[] = [];
  for (let i = 0; i < nodes.length; i += 2) {
    const left = nodes[i];
    const right = nodes[i + 1] || nodes[i]; // duplicate last if odd
    
    nextLevel.push({
      hash: hashParentNode(left.hash, right.hash, fn, combineMethod, commutative),
      left,
      right,
    });
  }
  return buildTreeLevel(nextLevel, fn, commutative, combineMethod);
}

export function getMerkleProof(leaves: string[], fn: HashFunction, leafIndex: number, commutative = false, combineMethod: 'concat' | 'sum' = 'concat'): { proof: string[]; leaf: string; leafIndex: number } | null {
  if (leaves.length === 0 || leafIndex < 0 || leafIndex >= leaves.length) return null;
  // Pad leaves to power of two as in buildMerkleTree
  const n = leaves.length;
  let nextPow2 = 1;
  while (nextPow2 < n) nextPow2 *= 2;
  const padCount = nextPow2 - n;
  const paddedLeaves = padCount > 0 ? leaves.concat(Array(padCount).fill(leaves[leaves.length - 1])) : leaves;
  // Hash all leaves
  let level = paddedLeaves.map(preimage => hashValue(preimage, fn));
  let index = leafIndex;
  const proof: string[] = [];
  while (level.length > 1) {
    const siblingIndex = index ^ 1;
    if (siblingIndex < level.length) {
      proof.push(level[siblingIndex]);
    }
    // Build next level
    const nextLevel: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] || level[i];
      nextLevel.push(hashParentNode(left, right, fn, combineMethod, commutative));
    }
    index = Math.floor(index / 2);
    level = nextLevel;
  }
  return { proof, leaf: paddedLeaves[leafIndex], leafIndex };
} 