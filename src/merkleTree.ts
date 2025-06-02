import { keccak_256 } from 'js-sha3';
import { sha256 } from 'js-sha256';
import { blake2bHex } from 'blakejs';
// @ts-expect-error: no types for ripemd160
// eslint-disable-next-line
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

export function buildMerkleTree(leaves: string[], fn: HashFunction): MerkleNode | null {
  if (leaves.length === 0) return null;
  const leafNodes = leaves.map(preimage => ({
    hash: hashValue(preimage, fn),
    isLeaf: true,
    preimage,
  }));
  return buildTreeLevel(leafNodes, fn);
}

function buildTreeLevel(nodes: MerkleNode[], fn: HashFunction): MerkleNode {
  if (nodes.length === 1) return nodes[0];
  const nextLevel: MerkleNode[] = [];
  for (let i = 0; i < nodes.length; i += 2) {
    const left = nodes[i];
    const right = nodes[i + 1] || nodes[i]; // duplicate last if odd
    const combined = left.hash + right.hash;
    nextLevel.push({
      hash: hashValue(combined, fn),
      left,
      right,
    });
  }
  return buildTreeLevel(nextLevel, fn);
} 