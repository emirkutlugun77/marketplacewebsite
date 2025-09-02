'use client'

import React from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Connection, PublicKey } from '@solana/web3.js'

const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
const connection = new Connection('https://api.devnet.solana.com', 'confirmed')

function getMetadataPDA(mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )
}

export default function NftDetailsPage() {
  const params = useParams() as { mint?: string }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState<string>('')
  const [symbol, setSymbol] = useState<string>('')
  const [image, setImage] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [attributes, setAttributes] = useState<any[]>([])

  useEffect(() => {
    const run = async () => {
      if (!params?.mint) return
      try {
        setLoading(true); setError(null)
        const mintPk = new PublicKey(params.mint)
        const [metadataPDA] = getMetadataPDA(mintPk)
        const acc = await connection.getAccountInfo(metadataPDA)
        if (!acc) throw new Error('metadata not found')
        const d = acc.data
        let off = 1 // key
        off += 32 // update auth
        off += 32 // mint
        const nameLen = d.readUInt32LE(off); off += 4
        const nameStr = d.slice(off, off + nameLen).toString('utf8'); off += nameLen
        const symbolLen = d.readUInt32LE(off); off += 4
        const symbolStr = d.slice(off, off + symbolLen).toString('utf8'); off += symbolLen
        const uriLen = d.readUInt32LE(off); off += 4
        const uriStr = d.slice(off, off + uriLen).toString('utf8'); off += uriLen
        // Try fetch JSON
        let json: any = null
        try {
          const res = await fetch(uriStr)
          if (res.ok) json = await res.json()
        } catch {}
        setName(nameStr.replace(/\0+$/, ''))
        setSymbol(symbolStr.replace(/\0+$/, ''))
        if (json) {
          setImage(json.image || '')
          setDescription(json.description || '')
          setAttributes(Array.isArray(json.attributes) ? json.attributes : [])
        } else {
          setImage('')
          setDescription('')
          setAttributes([])
        }
      } catch (e:any) {
        setError(e.message || String(e))
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [params?.mint])

  return (
    <main className="min-h-[100dvh] bg-white">
      <div className="w-full">
        <div className="border-b border-black p-4 flex items-center justify-between">
          <div className="lowercase text-neutral-700 text-sm">nft details</div>
          <Link href="/app/marketplace" className="text-sm underline">back to marketplace</Link>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-neutral-600">loading...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[40%_60%] divide-y md:divide-y-0 md:divide-x divide-black">
            <div className="p-6 border-b md:border-b-0">
              <div className="border border-black rounded-sm overflow-hidden bg-white">
                <div className="aspect-square w-full bg-white flex items-center justify-center">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt={name} className="h-full w-full object-contain p-3" />
                  ) : (
                    <div className="text-xs text-neutral-500">no image</div>
                  )}
                </div>
                <div className="px-3 py-2 border-t border-black">
                  <div className="text-[12px] lowercase text-neutral-700">{name}</div>
                  {symbol && <div className="text-[11px] lowercase text-neutral-500">{symbol}</div>}
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {description && (
                <div>
                  <div className="lowercase text-xs text-neutral-600 mb-2">description</div>
                  <div className="text-sm text-neutral-800 whitespace-pre-wrap">{description}</div>
                </div>
              )}
              <div>
                <div className="lowercase text-xs text-neutral-600 mb-2">attributes</div>
                {attributes.length === 0 ? (
                  <div className="text-sm text-neutral-500 lowercase">no attributes</div>
                ) : (
                  <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {attributes.map((a:any, idx:number) => (
                      <li key={idx} className="border border-black rounded-sm bg-white">
                        <div className="px-3 py-2">
                          <div className="text-[10px] uppercase tracking-wide text-neutral-500">{a.trait_type || a.trait || 'trait'}</div>
                          <div className="text-[12px] lowercase text-neutral-800">{String(a.value ?? '')}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
