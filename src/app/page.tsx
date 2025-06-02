'use client';
import { useState, useMemo, useEffect } from "react";
import styles from "./page.module.css";
import { buildMerkleTree, HashFunction, getMerkleProof } from "../merkleTree";
import MerkleTreeView from "./MerkleTreeView";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Footer } from './components/Footer';

const hashFunctions = [
  { label: "Keccak", value: "keccak" },
  { label: "SHA-256", value: "sha256" },
  { label: "BLAKE2b", value: "blake2b" },
  { label: "RIPEMD160", value: "ripemd160" },
];

const padStrategies = [
  { label: "Copy last real leaf", value: "copy" },
  { label: "Add zero-preimage leaves", value: "zero" },
];

const combineMethods = [
  { label: "Concatenate", value: "concat" },
  { label: "Sum", value: "sum" },
];

type PadStrategy = "copy" | "zero";

const LOCAL_STORAGE_KEY = "merkle-visualizer-state";

function DraggableLeaf({ id, children, disabled }: { id: string; children: (args: { attributes: any; listeners: any }) => React.ReactNode; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? '#f5f5f5' : undefined,
  };
  return (
    <li ref={setNodeRef} style={style}>
      {children({ attributes, listeners })}
    </li>
  );
}

export default function MerkleTreePage() {
  const [hashFunction, setHashFunction] = useState<HashFunction>("keccak");
  const [leafInput, setLeafInput] = useState("");
  const [leaves, setLeaves] = useState<string[]>([]);
  const [showPreimage, setShowPreimage] = useState(true);
  const [showHash, setShowHash] = useState(true);
  const [padStrategy, setPadStrategy] = useState<PadStrategy>("copy");
  const [showLabel, setShowLabel] = useState(true);
  const [commutative, setCommutative] = useState(false);
  const [combineMethod, setCombineMethod] = useState<'concat' | 'sum'>('concat');
  const sensors = useSensors(useSensor(PointerSensor));
  const [selectedLeaf, setSelectedLeaf] = useState<number | null>(null);

  // Restore state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.leaves && Array.isArray(parsed.leaves)) setLeaves(parsed.leaves);
        if (parsed.hashFunction) setHashFunction(parsed.hashFunction);
        if (parsed.padStrategy) setPadStrategy(parsed.padStrategy);
      } catch {}
    }
    // eslint-disable-next-line
  }, []);

  // Save state to localStorage on change
  useEffect(() => {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({ leaves, hashFunction, padStrategy })
    );
  }, [leaves, hashFunction, padStrategy]);

  const handleAddLeaf = () => {
    if (leafInput.trim()) {
      setLeaves([...leaves, leafInput]);
      setLeafInput("");
    }
  };

  const paddedLeaves = useMemo(() => {
    if (leaves.length === 0) return [];
    let n = leaves.length;
    let nextPow2 = 1;
    while (nextPow2 < n) nextPow2 *= 2;
    if (n === nextPow2) return leaves;
    const padCount = nextPow2 - n;
    if (padStrategy === "copy") {
      return leaves.concat(Array(padCount).fill(leaves[leaves.length - 1]));
    } else if (padStrategy === "zero") {
      return leaves.concat(Array(padCount).fill("0"));
    }
    return leaves;
  }, [leaves, padStrategy]);

  const tree = useMemo(() => buildMerkleTree(paddedLeaves, hashFunction, commutative, combineMethod), [paddedLeaves, hashFunction, commutative, combineMethod]);

  const proofResult = useMemo(() => {
    if (selectedLeaf === null || selectedLeaf >= paddedLeaves.length) return null;
    return getMerkleProof(paddedLeaves, hashFunction, selectedLeaf, commutative, combineMethod);
  }, [selectedLeaf, paddedLeaves, hashFunction, commutative, combineMethod]);

  const handleCopyProof = () => {
    if (proofResult) {
      navigator.clipboard.writeText(JSON.stringify(proofResult, null, 2));
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = leaves.findIndex((_, i) => i.toString() === active.id);
      const newIndex = leaves.findIndex((_, i) => i.toString() === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        setLeaves(arrayMove(leaves, oldIndex, newIndex));
      }
    }
  };

  const handleResetState = () => {
    setLeaves([]);
    setHashFunction("keccak");
    setPadStrategy("copy");
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  return (
    <div className={styles.page} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <main className={styles.main}>
        <h1>Merkle Tree Visualizer</h1>        
        <div className={styles.optionsGrid}>
          <div>
            <label htmlFor="hash-fn">Hash Function: </label>
            <select
              id="hash-fn"
              value={hashFunction}
              onChange={e => setHashFunction(e.target.value as HashFunction)}
            >
              {hashFunctions.map(fn => (
                <option key={fn.value} value={fn.value}>{fn.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pad-strategy">Pad to power-of-two: </label>
            <select
              id="pad-strategy"
              value={padStrategy}
              onChange={e => setPadStrategy(e.target.value as PadStrategy)}
            >
              {padStrategies.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="combine-method">Combine Method: </label>
            <select
              id="combine-method"
              value={combineMethod}
              onChange={e => setCombineMethod(e.target.value as 'concat' | 'sum')}
            >
              {combineMethods.map(method => (
                <option key={method.value} value={method.value}>{method.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', margin: '16px 0' }}>
          <label>
            <input
              type="checkbox"
              checked={showPreimage}
              onChange={e => setShowPreimage(e.target.checked)}
            />
            Show preimage
          </label>
          <label>
            <input
              type="checkbox"
              checked={showHash}
              onChange={e => setShowHash(e.target.checked)}
            />
            Show hash
          </label>
          <label>
            <input
              type="checkbox"
              checked={showLabel}
              onChange={e => setShowLabel(e.target.checked)}
            />
            Show label
          </label>
          <label>
            <input
              type="checkbox"
              checked={commutative}
              onChange={e => setCommutative(e.target.checked)}
            />
            Commutative nodes
            <a
              href="https://bitcoin.stackexchange.com/a/100102"
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginLeft: 4, fontSize: 14, textDecoration: 'none', color: '#888', verticalAlign: 'middle' }}
              title="About commutative Merkle trees"
            >
              ↗
            </a>
          </label>
          <button onClick={handleResetState} className={styles.button}>Reset State</button>
        </div>
        {commutative && (
          <></>
        )}
        <div>
          <h2>Leaves</h2>
          <div style={{ marginBottom: 16 }}>
            <input
              type="text"
              value={leafInput}
              onChange={e => setLeafInput(e.target.value)}
              placeholder="Enter leaf preimage"
              className={styles.input}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleAddLeaf();
                }
              }}
            />
            <button onClick={handleAddLeaf} className={styles.button}>Add Leaf</button>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={leaves.map((_, i) => i.toString())} strategy={verticalListSortingStrategy}>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {paddedLeaves.map((leaf, idx) => (
                  <DraggableLeaf key={idx} id={idx.toString()} disabled={idx >= leaves.length}>
                    {({ attributes, listeners }: any) => (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {idx < leaves.length && (
                          <span
                            {...attributes}
                            {...listeners}
                            style={{ cursor: 'grab', color: '#bbb', fontSize: 18, marginRight: 8, marginLeft: 2, userSelect: 'none' }}
                            title="Drag to reorder"
                          >
                            ⋮
                          </span>
                        )}
                        {leaf}
                        {idx < leaves.length && (
                          <button
                            style={{ marginLeft: 8, fontSize: 12, padding: '2px 8px', cursor: 'pointer' }}
                            onClick={() => setLeaves(leaves => leaves.filter((_, i) => i !== idx))}
                          >
                            Remove
                          </button>
                        )}
                        {idx >= leaves.length ? <span style={{ color: '#888', marginLeft: 8 }}>(padded)</span> : null}
                      </div>
                    )}
                  </DraggableLeaf>
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
        <div>
          <h2>Merkle Tree Visualization</h2>
          <div className={styles.treeContainer}>
            <MerkleTreeView root={tree} showPreimage={showPreimage} showHash={showHash} showLabel={showLabel} />
          </div>
        </div>
        <div>
          <h2>Merkle Proof</h2>
          <div style={{ marginBottom: 8 }}>
            <label>
              Select leaf:
              <select
                value={selectedLeaf === null ? '' : selectedLeaf}
                onChange={e => setSelectedLeaf(e.target.value === '' ? null : Number(e.target.value))}
                style={{ marginLeft: 8 }}
              >
                <option value="">-- select --</option>
                {paddedLeaves.map((leaf, idx) => (
                  <option key={idx} value={idx}>
                    {leaf} {idx >= leaves.length ? '(padded)' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {proofResult && (
            <div style={{ marginBottom: 8 }}>
              {!commutative && (
                <>
                  <div>Proof for leaf <b>{proofResult.leaf}</b> (index {proofResult.leafIndex}):</div>
                  <ol style={{ fontSize: 13, margin: '8px 0 8px 20px', wordBreak: 'break-all' }}>
                    {proofResult.proof.map((hash, i) => (
                      <li key={i}>{hash}</li>
                    ))}
                  </ol>
                </>
              )}
              {commutative && (
                <>
                  <div>Proof (commutative):</div>
                  <ol style={{ fontSize: 13, margin: '8px 0 8px 20px', wordBreak: 'break-all' }}>
                    {proofResult.proof.map((hash, i) => (
                      <li key={i}>{hash}</li>
                    ))}
                  </ol>
                </>
              )}
              <button className={styles.button} onClick={() => {
                if (commutative) {
                  navigator.clipboard.writeText(JSON.stringify(proofResult.proof, null, 2));
                } else {
                  navigator.clipboard.writeText(JSON.stringify(proofResult, null, 2));
                }
              }}>Copy proof as JSON</button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
