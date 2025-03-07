import keccak256 from 'keccak256'
import { BigNumber, utils } from 'ethers'
import { MerkleTree } from 'merkletreejs'

function hashLeaf ([address, entry]) {
  const salt = keccak256('MERKLE_REWARDS_LEAF_HASH')
  return utils.solidityKeccak256(['bytes32', 'address', 'uint256'], [salt, address, entry.balance])
}

export function getEntryProofIndex (address: string, entry: any, proof: any) {
  let index = 0
  let computedHash = hashLeaf([address, entry])

  for (let i = 0; i < proof.length; i++) {
    index *= 2
    const proofElement = proof[i]

    if (computedHash <= proofElement) {
      // Hash(current computed hash + current element of the proof)
      computedHash = utils.solidityKeccak256(['bytes32', 'bytes32'], [computedHash, proofElement])
    } else {
      // Hash(current element of the proof + current computed hash)
      computedHash = utils.solidityKeccak256(['bytes32', 'bytes32'], [proofElement, computedHash])
      index += 1
    }
  }
  return index
}

class ShardedMerkleTree {
  fetcher: any
  shardNybbles: any
  root: any
  total: any
  shards: any
  trees: any

  constructor (fetcher: any, shardNybbles: any, root: any, total: any) {
    this.fetcher = fetcher
    this.shardNybbles = shardNybbles
    this.root = root
    this.total = total
    this.shards = {}
    this.trees = {}
  }

  async getProof (address: string) {
    const shardid = address.slice(2, 2 + this.shardNybbles).toLowerCase()

    let shard = this.shards[shardid]

    if (shard === undefined) {
      shard = this.shards[shardid] = await this.fetcher(shardid)
      this.trees[shardid] = new MerkleTree(Object.entries(shard.entries).map(hashLeaf), keccak256, {
        sort: true
      })
    }

    const entry = shard.entries[address.toLowerCase()]
    if (!entry) {
      throw new Error('Invalid Entry')
    }

    const leaf = hashLeaf([address, entry])

    const proof = this.trees[shardid].getProof(leaf).map((entry: any) => '0x' + entry.data.toString('hex'))

    return [entry, proof.concat(shard.proof)]
  }

  async fetchProof (address :string) {
    const shardid = address.slice(2, 2 + this.shardNybbles).toLowerCase()
    let shard = this.shards[shardid]

    if (shard === undefined) {
      shard = this.shards[shardid] = await this.fetcher(shardid)
      this.trees[shardid] = new MerkleTree(Object.entries(shard.entries).map(hashLeaf), keccak256, {
        sort: true
      })
    }

    const entry = shard.entries[address]

    if (!entry) {
      throw new Error('Invalid Entry')
    }
    const leaf = hashLeaf([address, entry])

    const proof = this.trees[shardid].getProof(leaf).map((entry: any) => '0x' + entry.data.toString('hex'))

    return [entry, proof.concat(shard.proof)]
  }

  static build (entries: any, shardNybbles: any, directory: string) {
    const shards: any = {}
    let total = BigNumber.from(0)
    for (const [address, entry] of entries) {
      const shard = address.slice(2, 2 + shardNybbles).toLowerCase()
      if (shards[shard] === undefined) {
        shards[shard] = []
      }
      shards[shard].push([address, entry])
      total = total.add(entry.balance)
    }
    const roots = Object.fromEntries(
      Object.entries(shards).map(([shard, entries]: any) => [
        shard,
        new MerkleTree(entries.map(hashLeaf), keccak256, { sort: true }).getRoot()
      ])
    )
    const tree = new MerkleTree(Object.values(roots), keccak256, { sort: true })

    return tree
  }

  static async fetchRootFile (merkleBaseUrl: string, rootHash: string) {
    const url = `${merkleBaseUrl}/${rootHash}/root.json`
    const res = await fetch(url)
    const rootFile = await res.json()
    if (!rootFile.root) {
      throw new Error('Invalid root file')
    }
    const { root, shardNybbles, total } = rootFile
    return {
      root,
      shardNybbles,
      total
    }
  }

  static async fetchTree (merkleBaseUrl: string, rootHash: string) {
    const { root, shardNybbles, total } = await ShardedMerkleTree.fetchRootFile(merkleBaseUrl, rootHash)
    return new ShardedMerkleTree(
      async (shard: any) => {
        const url = `${merkleBaseUrl}/${rootHash}/${shard}.json`
        const res = await fetch(url)
        if (res.status === 404) {
          throw new Error('Invalid Entry')
        }
        return res.json()
      },
      shardNybbles,
      root,
      BigNumber.from(total)
    )
  }
}

export { ShardedMerkleTree }
