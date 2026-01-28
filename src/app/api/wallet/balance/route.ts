import { NextResponse } from 'next/server'
import { z } from 'zod'
import { anvilLocal } from '@/lib/web3/anvilChain'
import { createPublicClient, formatUnits, http } from 'viem'
import { cutiTokenAbi } from '@/lib/web3/abis/cutiToken'
import { CUTI_TOKEN_ADDRESS, CUTI_TOKEN_CONFIG } from '@/lib/web3/cutiTokenConfig'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const requestSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
})

export async function GET(request: Request) {
  const url = new URL(request.url)
  const parseResult = requestSchema.safeParse({
    address: url.searchParams.get('address') ?? undefined,
  })

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Alamat wallet tidak valid' }, { status: 400 })
  }

  const { address } = parseResult.data

  try {
    const client = createPublicClient({
      chain: anvilLocal,
      transport: http(anvilLocal.rpcUrls.default.http[0]),
    })

    // Fetch CUTI token balance (ERC-20)
    const balance = await client.readContract({
      address: CUTI_TOKEN_ADDRESS,
      abi: cutiTokenAbi,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    }) as bigint

    const formatted = formatUnits(balance, CUTI_TOKEN_CONFIG.decimals)

    return NextResponse.json({
      address,
      value: balance.toString(),
      decimals: CUTI_TOKEN_CONFIG.decimals,
      symbol: CUTI_TOKEN_CONFIG.symbol,
      formatted,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[wallet/balance]', error)
    const message =
      error instanceof Error ? error.message : 'Gagal mengambil saldo CUTI token'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
