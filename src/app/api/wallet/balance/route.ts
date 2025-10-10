import { NextResponse } from 'next/server'
import { z } from 'zod'
import { mandalaTestnet } from '@/lib/web3/mandalaChain'
import { createPublicClient, formatUnits, http } from 'viem'

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
      chain: mandalaTestnet,
      transport: http(mandalaTestnet.rpcUrls.default.http[0]),
    })

    const balance = await client.getBalance({
      address: address as `0x${string}`,
    })

    const formatted = formatUnits(balance, mandalaTestnet.nativeCurrency.decimals)

    return NextResponse.json({
      address,
      value: balance.toString(),
      decimals: mandalaTestnet.nativeCurrency.decimals,
      symbol: mandalaTestnet.nativeCurrency.symbol,
      formatted,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[wallet/balance]', error)
    const message =
      error instanceof Error ? error.message : 'Gagal mengambil saldo dari Mandala RPC'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
