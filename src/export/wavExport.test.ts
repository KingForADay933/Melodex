import { describe, expect, it } from 'vitest'
import { audioBufferToWavBlob } from './wavExport'

function makeBuffer(channelData: number[][], sampleRate = 44100) {
  return {
    numberOfChannels: channelData.length,
    length: channelData[0].length,
    sampleRate,
    getChannelData: (channel: number) => Float32Array.from(channelData[channel]),
  }
}

async function readHeader(blob: Blob) {
  const buf = await blob.arrayBuffer()
  const view = new DataView(buf)
  const readString = (offset: number, length: number) =>
    String.fromCharCode(...new Uint8Array(buf, offset, length))
  return { buf, view, readString }
}

describe('audioBufferToWavBlob', () => {
  it('produces a blob sized as a 44-byte header plus interleaved 16-bit PCM data', async () => {
    const buffer = makeBuffer([
      [1, -1, 0],
      [-0.5, 1.5, -2],
    ])
    const blob = audioBufferToWavBlob(buffer)
    expect(blob.type).toBe('audio/wav')
    expect(blob.size).toBe(44 + 3 * 2 * 2) // 3 frames * 2 channels * 2 bytes
  })

  it('writes a valid RIFF/WAVE header describing the buffer', async () => {
    const buffer = makeBuffer([[0, 0], [0, 0]], 48000)
    const blob = audioBufferToWavBlob(buffer)
    const { view, readString } = await readHeader(blob)

    expect(readString(0, 4)).toBe('RIFF')
    expect(readString(8, 4)).toBe('WAVE')
    expect(readString(12, 4)).toBe('fmt ')
    expect(readString(36, 4)).toBe('data')

    const dataSize = 2 * 2 * 2 // 2 frames * 2 channels * 2 bytes
    expect(view.getUint32(4, true)).toBe(36 + dataSize)
    expect(view.getUint16(20, true)).toBe(1) // PCM
    expect(view.getUint16(22, true)).toBe(2) // numChannels
    expect(view.getUint32(24, true)).toBe(48000) // sampleRate
    expect(view.getUint32(28, true)).toBe(48000 * 4) // byteRate = sampleRate * blockAlign
    expect(view.getUint16(32, true)).toBe(4) // blockAlign = channels * bytesPerSample
    expect(view.getUint16(34, true)).toBe(16) // bitsPerSample
    expect(view.getUint32(40, true)).toBe(dataSize)
  })

  it('encodes samples as interleaved 16-bit PCM, clamping out-of-range values to [-1, 1]', async () => {
    const buffer = makeBuffer([
      [1, -1, 0], // left: max, min, silence
      [-0.5, 1.5, -2], // right: exact -16384, clamped to 1.0, clamped to -1.0
    ])
    const blob = audioBufferToWavBlob(buffer)
    const { view } = await readHeader(blob)

    const sampleAt = (frame: number, channel: number) => view.getInt16(44 + (frame * 2 + channel) * 2, true)

    expect(sampleAt(0, 0)).toBe(32767) // 1.0 * 0x7fff
    expect(sampleAt(0, 1)).toBe(-16384) // -0.5 * 0x8000
    expect(sampleAt(1, 0)).toBe(-32768) // -1.0 * 0x8000
    expect(sampleAt(1, 1)).toBe(32767) // 1.5 clamped to 1.0
    expect(sampleAt(2, 0)).toBe(0)
    expect(sampleAt(2, 1)).toBe(-32768) // -2.0 clamped to -1.0
  })
})
