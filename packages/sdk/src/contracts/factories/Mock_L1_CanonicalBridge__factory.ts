/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type {
  Mock_L1_CanonicalBridge,
  Mock_L1_CanonicalBridgeInterface,
} from "../Mock_L1_CanonicalBridge.js";

const _abi = [
  {
    inputs: [
      {
        internalType: "contract IERC20",
        name: "_canonicalToken",
        type: "address",
      },
      {
        internalType: "contract Mock_L1_Messenger",
        name: "_messenger",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "canonicalToken",
    outputs: [
      {
        internalType: "contract IERC20",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "messenger",
    outputs: [
      {
        internalType: "contract Mock_L1_Messenger",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_target",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "_message",
        type: "bytes",
      },
    ],
    name: "sendMessage",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_target",
        type: "address",
      },
      {
        internalType: "address",
        name: "_recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "isPolygon",
        type: "bool",
      },
    ],
    name: "sendTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

export class Mock_L1_CanonicalBridge__factory {
  static readonly abi = _abi;
  static createInterface(): Mock_L1_CanonicalBridgeInterface {
    return new utils.Interface(_abi) as Mock_L1_CanonicalBridgeInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): Mock_L1_CanonicalBridge {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as Mock_L1_CanonicalBridge;
  }
}
