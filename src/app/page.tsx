'use client';
import { useState, useMemo, useEffect } from "react";
import styles from "./page.module.css";
import { buildMerkleTree, HashFunction } from "../merkleTree";
import MerkleTreeView from "./MerkleTreeView";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

type PadStrategy = "copy" | "zero";

const LOCAL_STORAGE_KEY = "merkle-visualizer-state";

function DraggableLeaf({ id, children, disabled }: { id: string; children: React.ReactNode; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: disabled ? 'default' : 'grab',
    background: isDragging ? '#f5f5f5' : undefined,
  };
  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
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
  const sensors = useSensors(useSensor(PointerSensor));

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

  const tree = useMemo(() => buildMerkleTree(paddedLeaves, hashFunction), [paddedLeaves, hashFunction]);

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
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Merkle Tree Visualizer</h1>        
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
          <input
            type="text"
            value={leafInput}
            onChange={e => setLeafInput(e.target.value)}
            placeholder="Enter leaf preimage"
            className={styles.input}
          />
          <button onClick={handleAddLeaf} className={styles.button}>Add Leaf</button>
          
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', margin: '16px 0' }}>
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
          
          <button onClick={handleResetState} className={styles.button}>Reset State</button>
        </div>
        <div>
          <h2>Leaves</h2>
          <div style={{ color: '#888', fontSize: 14, marginBottom: 4 }}>
            Drag the <span style={{fontFamily: 'monospace'}}>::</span> handle to reorder leaves
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={leaves.map((_, i) => i.toString())} strategy={verticalListSortingStrategy}>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {paddedLeaves.map((leaf, idx) => (
                  <DraggableLeaf key={idx} id={idx.toString()} disabled={idx >= leaves.length}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {idx < leaves.length && (
                        <span style={{ cursor: 'grab', color: '#bbb', fontSize: 18, marginRight: 8, marginLeft: 2, userSelect: 'none' }} title="Drag to reorder">⋮</span>
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
      </main>
    </div>
  );
}
