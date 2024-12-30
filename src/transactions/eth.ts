import { format, getUnixTime, isSameYear } from 'date-fns'
import { curry, equals, includes, lift, map, toLower } from 'ramda'

import { EthRawTxType } from '@core/network/api/eth/types'
import { calculateFee } from '@core/utils/eth'

import {
  getDefaultAddress,
  getDefaultLabel,
  getErc20TxNote,
  getEthTxNote
} from '../redux/kvStore/eth/selectors'
import Remote from '../remote'

//
// Shared Utils
//
export const getTime = (timeStamp: number | Date) => {
  const date = new Date(getUnixTime(timeStamp) * 1000)
  return isSameYear(date, new Date())
    ? format(date, 'MMMM d @ h:mm a')
    : format(date, 'MMMM d yyyy @ h:mm a')
}

const getType = (tx, addresses) => {
  const lowerAddresses = map(toLower, addresses)

  switch (true) {
    case includes(tx.from, lowerAddresses) && includes(tx.to, lowerAddresses):
      return 'Transferred'
    case includes(tx.from, lowerAddresses):
      return 'Sent'
    case includes(tx.to, lowerAddresses):
      return 'Received'
    default:
      return 'Unknown'
  }
}

//
// ETH
//

export const getLabel = (address, state) => {
  const defaultLabelR = getDefaultLabel(state)
  const defaultAddressR = getDefaultAddress(state)
  const transform = (defaultLabel, defaultAddress) => {
    switch (true) {
      case equals(toLower(defaultAddress), toLower(address)):
        return defaultLabel
      default:
        return address
    }
  }
  const labelR = lift(transform)(defaultLabelR, defaultAddressR)
  return labelR.getOrElse(address)
}

export const _transformTx = curry((addresses, erc20Contracts, state, tx: EthRawTxType) => {
  const fee = calculateFee(tx.gasPrice, tx.state === 'CONFIRMED' ? tx.gasUsed : tx.gasLimit, false)
  const type = toLower(getType(tx, addresses))
  const amount =
    type === 'sent' ? parseInt(tx.value, 10) + parseInt(fee, 10) : parseInt(tx.value, 10)
  // @ts-ignore
  const time = tx.timestamp || tx.timeStamp
  const isErc20 = includes(tx.to, erc20Contracts.map(toLower))

  return {
    amount,
    blockHeight: tx.state === 'CONFIRMED' ? tx.blockNumber : undefined,
    data: isErc20 ? tx.data : null,
    description: getEthTxNote(state, tx.hash).getOrElse(''),
    erc20: isErc20,
    fee: Remote.Success(fee),
    from: getLabel(tx.from, state),
    hash: tx.hash,
    insertedAt: Number(time) * 1000,
    state: tx.state,
    time,
    timeFormatted: getTime(new Date(time * 1000)),
    to: getLabel(tx.to, state),
    type
  }
})

//
// ERC20
//
export const getErc20Label = (address, token, state) => {
  const ethAddressR = getDefaultAddress(state)
  const transform = (ethAddress) => {
    if (equals(toLower(ethAddress), toLower(address))) {
      return `${token} DeFi Wallet`
    }
    return address
  }
  const labelR = lift(transform)(ethAddressR)
  return labelR.getOrElse(address)
}

export const _transformErc20Tx = curry((addresses, state, token, tx) => {
  const type = toLower(getType(tx, addresses))
  const time = tx.timestamp || tx.timeStamp

  return {
    amount: parseInt(tx.value, 10),
    blockHeight: tx.blockNumber,
    coin: token,
    description: getErc20TxNote(state, token, tx.transactionHash).getOrElse(''),
    fee: Remote.NotAsked,
    from: getErc20Label(tx.from, token, state),
    hash: tx.transactionHash,
    insertedAt: Number(time) * 1000,
    state: tx.state,
    time,
    timeFormatted: getTime(new Date(time * 1000)),
    to: getErc20Label(tx.to, token, state),
    type
  }
})

export const transformTx = _transformTx
export const transformErc20Tx = _transformErc20Tx
