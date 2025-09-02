# NFT Metadata Test Guide

## Sorun
Solscan'de NFT metadata görünmüyor çünkü metadata account oluşturuluyor ama içeriği doldurulmuyordu.

## Çözüm
Kod düzeltildi ve şu adımlar eklendi:

1. **Mint Account Oluşturma** - `SystemProgram.createAccount`
2. **Mint Initialization** - `createInitializeMintInstruction`
3. **Associated Token Account** - `createAssociatedTokenAccountInstruction`
4. **Token Minting** - `createMintToInstruction`
5. **Metadata Account Oluşturma** - `createMetadataAccount` (yeni eklenen)
6. **Custom Program Instruction** - Sizin programınızın instruction'ı

## Test Etmek İçin

### 1. Presale NFT Mint
```typescript
// Presale NFT mint ederken metadata otomatik oluşturulacak
const presaleAttributes = [
  { trait_type: 'Type', value: 'Access Pass' },
  { trait_type: 'Rarity', value: 'Common' },
  { trait_type: 'Game', value: 'GameFi' },
  { trait_type: 'Edition', value: 'Presale' }
]

const metadataInstruction = await createMetadataAccount(
  nftMint.publicKey,
  'GameFi Access Pass',
  'GFAP',
  'https://raw.githubusercontent.com/gamefi-presale/metadata/main/access-pass.json',
  presaleAttributes
)
```

### 2. Normal NFT Mint
```typescript
// Template'den NFT mint ederken metadata otomatik oluşturulacak
const metadataInstruction = await createMetadataAccount(
  nftMint.publicKey,
  template.name,
  template.symbol,
  template.uri,
  template.metadata?.attributes || [] // Template'den gelen attributes
)
```

## Pinata API Güncellemesi
- **JWT yerine API Key + Secret kullanılıyor**
- **Fotoğraf upload için dosya input'u eklendi**
- **Otomatik IPFS upload ve metadata oluşturma**

## Metadata Format
Metadata account şu bilgileri içerir:
- **Name**: NFT adı
- **Symbol**: NFT sembolü  
- **URI**: Metadata JSON dosyasının IPFS/HTTP linki
- **Creator**: NFT yaratıcısı (wallet address)
- **Seller Fee**: Satış komisyonu (0 olarak ayarlandı)
- **Attributes**: NFT özellikleri (trait_type ve value çiftleri)

### Attributes Örneği:
```json
[
  { "trait_type": "Type", "value": "Access Pass" },
  { "trait_type": "Rarity", "value": "Common" },
  { "trait_type": "Game", "value": "GameFi" },
  { "trait_type": "Edition", "value": "Presale" },
  { "trait_type": "Power", "value": 75 },
  { "trait_type": "Level", "value": 1 }
]
```

## Solscan'de Görünmesi İçin
1. Metadata account düzgün oluşturulmalı
2. Metadata account'ın içeriği dolu olmalı
3. Devnet'te bazen gecikme olabilir (5-10 dakika)

## Test Sonrası
Mint işlemi tamamlandıktan sonra:
1. Solscan'de token address'ı arayın
2. Metadata sekmesinde bilgiler görünmeli
3. Eğer hala görünmüyorsa, birkaç dakika bekleyin

## Hata Durumunda
- Console'da hata mesajlarını kontrol edin
- Transaction signature'ı Solscan'de arayın
- Metadata account'ın oluşturulup oluşturulmadığını kontrol edin

## Önemli Düzeltmeler
### Signature Verification Hatası
**Hata**: "Missing signature for public key"
**Çözüm**: Transaction'da `partialSign` ve `signTransaction` doğru sırayla kullanılıyor

```typescript
// 1. Önce nftMint keypair ile imzala
transaction.partialSign(nftMint)

// 2. Sonra wallet ile imzala
const signedTx = await signTransaction(transaction)

// 3. Tam imzalanmış transaction'ı gönder
const signature = await connection.sendRawTransaction(signedTx.serialize(), {
  maxRetries: 3,
  skipPreflight: true,
  preflightCommitment: 'processed'
})
```
