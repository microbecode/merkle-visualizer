import React, { useMemo, useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { MerkleNode } from '../merkleTree';

// Dynamically import react-d3-tree to avoid SSR issues
const Tree = dynamic(() => import('react-d3-tree').then(mod => mod.Tree), { ssr: false });

type D3Node = {
  name: string;
  attributes?: Record<string, string | number | boolean>;
  children?: D3Node[];
  raw?: MerkleNode;
};

function truncate(hash: string) {
  return hash.slice(0, 8) + '...' + hash.slice(-6);
}

function merkleToD3(node: MerkleNode | null, isRoot = true): D3Node | null {
  if (!node) return null;
  if (node.isLeaf) {
    return {
      name: 'Leaf',
      attributes: {
        preimage: node.preimage || '',
        hash: truncate(node.hash),
      },
      raw: node,
    };
  }
  const children: D3Node[] = [];
  if (node.left) children.push(merkleToD3(node.left, false)!);
  if (node.right && node.right !== node.left) children.push(merkleToD3(node.right, false)!);
  return {
    name: isRoot ? 'Root' : 'Node',
    attributes: {
      hash: truncate(node.hash),
    },
    children,
    raw: node,
  };
}

interface MerkleTreeViewProps {
  root: MerkleNode | null;
  showPreimage: boolean;
  showHash: boolean;
  showLabel: boolean;
}

export default function MerkleTreeView({ root, showPreimage, showHash, showLabel }: MerkleTreeViewProps) {
  const treeData = useMemo(() => (root ? [merkleToD3(root)!] : []), [root]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });
  const [translate, setTranslate] = useState<{ x: number; y: number } | null>(null);
  const [treeKey, setTreeKey] = useState(0);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
    }
  }, [root]);

  useEffect(() => {
    if (dimensions.width && dimensions.height) {
      setTranslate({ x: dimensions.width / 2, y: dimensions.height / 2 });
    }
  }, [dimensions.width, dimensions.height]);

  const handleResetView = () => {
    if (dimensions.width && dimensions.height) {
      setTranslate({ x: dimensions.width / 2, y: dimensions.height / 2 });
      setTreeKey(k => k + 1);
    }
  };

  const renderCustomNode = ({ nodeDatum }: { nodeDatum: D3Node }) => {
    const boxWidth = 140;
    let lines = 0;
    if (showLabel) lines++;
    if (showPreimage && nodeDatum.attributes?.preimage) lines++;
    if (showHash && nodeDatum.attributes?.hash) lines++;
    const boxHeight = 18 * lines + 18;
    let y = -boxHeight / 2 + 16;
    let line = 0;
    const fullHash = nodeDatum.raw?.hash;
    return (
      <g>
        <rect
          x={-boxWidth / 2}
          y={-boxHeight / 2}
          width={boxWidth}
          height={boxHeight}
          fill="#fff"
          stroke="#222"
          strokeWidth={1.5}
          rx={8}
        />
        {showLabel && (
          <text x={0} y={y + 18 * line++} textAnchor="middle" fontWeight="normal" fontSize="1em" fill="#222" fontFamily="Inter, Arial, Helvetica, sans-serif">
            {nodeDatum.name}
          </text>
        )}
        {showPreimage && nodeDatum.attributes?.preimage && (
          <text x={0} y={y + 18 * line++} textAnchor="middle" fontSize="0.95em" fill="#222" fontWeight="normal" fontFamily="Inter, Arial, Helvetica, sans-serif">
            {String(nodeDatum.attributes.preimage)}
          </text>
        )}
        {showHash && nodeDatum.attributes?.hash && (
          <foreignObject x={-boxWidth / 2 + 4} y={y + 18 * line - 12} width={boxWidth - 8} height={20} style={{ pointerEvents: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <span style={{ fontSize: '0.85em', fontFamily: 'Inter, Arial, Helvetica, sans-serif', color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 60 }} title={String(nodeDatum.raw?.hash)}>
                {String(nodeDatum.attributes.hash)}
              </span>
              {fullHash && (
                <button
                  style={{ background: '#f5f5f5', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', padding: '2px 6px', fontSize: 12, marginLeft: 4, display: 'flex', alignItems: 'center' }}
                  title="Copy hash to clipboard"
                  onClick={e => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(fullHash);
                    setCopiedHash(fullHash);
                    setTimeout(() => setCopiedHash(null), 1000);
                  }}
                >
                  {copiedHash === fullHash ? '✅' : '📋'}
                </button>
              )}
            </div>
          </foreignObject>
        )}
      </g>
    );
  };

  if (!root) return <div>No tree to display.</div>;
  return (
    <div>
      <button onClick={handleResetView} style={{ marginBottom: 8 }}>Reset View</button>
      <div ref={containerRef} style={{ width: '100%', height: 400 }}>
        <Tree
          key={treeKey}
          data={treeData}
          orientation="vertical"
          translate={translate || { x: dimensions.width / 2, y: dimensions.height / 2 }}
          nodeSize={{ x: 180, y: 80 }}
          zoomable={true}
          collapsible={false}
          renderCustomNodeElement={renderCustomNode}
        />
      </div>
    </div>
  );
} 