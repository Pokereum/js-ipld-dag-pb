'use strict'

const mh = require('multihashes')

const ImmutableError = new Error('Immutable property')

// Link represents an IPFS Merkle DAG Link between Nodes.
class DAGLink {
  constructor (name, size, multihash) {
    this._name = name
    this._size = size
    this._multihash = null

    if (typeof multihash === 'string') {
      this._multihash = mh.fromB58String(multihash)
    } else if (Buffer.isBuffer(multihash)) {
      this._multihash = multihash
    }
  }

  toString () {
    const mhStr = mh.toB58String(this.multihash)
    return `DAGLink <${mhStr} - name: "${this.name}", size: ${this.size}>`
  }

  toJSON() {
    return {
      name: this.name,
      size: this.size,
      hash: this.multihash ? mh.toB58String(this.multihash) : null
    }
  }

  get name() {
    return this._name
  }

  set name() {
    throw ImmutableError
  }

  get size() {
    return this._size
  }

  set size() {
    throw ImmutableError
  }

  get hash() {
    return this._multihash ? mh.toB58String(this._multihash) : undefined
  }

  set hash() {
    throw ImmutableError
  }
}

module.exports = DAGLink
