"""Remux matching H.264 clips A then B without reencoding; retain both originals."""
from pathlib import Path
from fractions import Fraction
import hashlib
import json
import av

root = Path(__file__).resolve().parent
sources = [root / 'desk-idle-grok-original.mp4', root / 'desk-idle-b-grok-original.mp4']
destination = root / 'desk-idle-ab-alternating.mp4'
metadata = []
expected_boundary_hashes = []
template_key = None
for path in sources:
    with av.open(str(path)) as container:
        stream = container.streams.video[0]
        key = (stream.codec_context.name, stream.codec_context.extradata, stream.width, stream.height, stream.time_base, stream.average_rate)
        if template_key is None:
            template_key = key
        assert key == template_key, 'Source streams differ; lossless remux is not safe'
        count = 0
        first = last = None
        for frame in container.decode(stream):
            digest = hashlib.sha256(frame.to_ndarray(format='rgb24').tobytes()).hexdigest()
            if first is None:
                first = digest
            last = digest
            count += 1
        metadata.append({'file': path.name, 'frames': count, 'fps': str(stream.average_rate), 'seconds': float(Fraction(count) / stream.average_rate), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
        expected_boundary_hashes.extend([first, last])

offset = 0
with av.open(str(destination), mode='w', options={'movflags': '+faststart'}) as output:
    output_stream = None
    for path, info in zip(sources, metadata):
        with av.open(str(path)) as container:
            stream = container.streams.video[0]
            if output_stream is None:
                output_stream = output.add_stream_from_template(stream)
                output_stream.time_base = stream.time_base
            for packet in container.demux(stream):
                if packet.dts is None:
                    continue
                if packet.pts is not None:
                    packet.pts += offset
                packet.dts += offset
                packet.stream = output_stream
                output.mux(packet)
            delta = Fraction(info['frames']) / stream.average_rate / stream.time_base
            assert delta.denominator == 1
            offset += int(delta)

indices = [0, metadata[0]['frames'] - 1, metadata[0]['frames'], sum(item['frames'] for item in metadata) - 1]
actual_boundary_hashes = []
count = 0
last_time = None
with av.open(str(destination)) as container:
    stream = container.streams.video[0]
    for frame in container.decode(stream):
        if last_time is not None:
            assert frame.time > last_time, 'Non-monotonic frame presentation'
        last_time = frame.time
        if count in indices:
            actual_boundary_hashes.append(hashlib.sha256(frame.to_ndarray(format='rgb24').tobytes()).hexdigest())
        count += 1
    assert actual_boundary_hashes == expected_boundary_hashes, 'Decoded boundary pixels changed'
    assert count == sum(item['frames'] for item in metadata)
    result = {
        'order': 'A -> B -> A -> B (native loop of losslessly joined A+B)',
        'sourcePosts': ['https://grok.com/imagine/post/0b6e1595-37fa-45ae-93e5-07602b449556', 'https://grok.com/imagine/post/10375ec8-fbf7-40e5-a6aa-f51db8a4eac1'],
        'sources': metadata,
        'output': destination.name,
        'frames': count, 'fps': str(stream.average_rate), 'width': stream.width, 'height': stream.height,
        'seconds': float(Fraction(count) / stream.average_rate),
        'reencoded': False,
        'audio': 'No track in preview assembly; both original source files retain their original audio',
        'validation': {'decodedFrames': count, 'monotonicFrameTimes': True, 'fourBoundaryFramesPixelExact': True, 'boundaryFrameIndices': indices},
        'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
        'browserVerification': 'Pending'
    }
(root / 'alternating-idle-record.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(result, ensure_ascii=False, indent=2))
