# Merkle Tree Visualizer

An interactive web application for visualizing and experimenting with Merkle trees. Build, modify, and explore Merkle trees with different hashing algorithms and combination methods.

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Features

- **Multiple Hash Functions**: Support for Keccak, SHA-256, BLAKE2b, and RIPEMD160
- **Flexible Tree Building**:
  - Concatenate or sum hashes for parent nodes
  - Optional commutative node ordering
  - Automatic padding to power-of-two
- **Interactive UI**:
  - Drag-and-drop leaf reordering
  - Toggle preimage/hash visibility
  - Copy hashes and proofs
  - Zoom and pan tree visualization
- **Merkle Proof Generation**: Generate and copy proofs for any leaf node
