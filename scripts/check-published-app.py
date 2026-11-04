"""Verify the immutable public Windows ZIP and every bundled file."""
import hashlib, io, json, urllib.request, zipfile
meta=json.load(open('data/desktop-release.json',encoding='utf-8'))
with urllib.request.urlopen(meta['url'],timeout=120) as response:
    data=response.read(100*1024*1024+1)
assert len(data)==meta['bytes'], 'ZIP byte count'
assert hashlib.sha256(data).hexdigest()==meta['sha256'], 'ZIP checksum'
with zipfile.ZipFile(io.BytesIO(data)) as z:
    names={n.replace('\\','/'):n for n in z.namelist()}
    assert len(names)==len(z.namelist()), 'Ambiguous archive paths'
    manifests=[n for n in names if n.endswith('/PACKAGE.json')]
    assert len(manifests)==1, 'Package manifest'
    root=manifests[0][:-len('PACKAGE.json')]
    package=json.loads(z.read(names[manifests[0]]).decode('utf-8-sig'))
    assert package['version']==meta['version'], 'Package version'
    for entry in package['files']:
        content=z.read(names[root+entry['path']])
        assert len(content)==entry['bytes'], entry['path']
        assert hashlib.sha256(content).hexdigest()==entry['sha256'], entry['path']
    assert root+'STAM.exe' in names
    assert root+'runtime/node.exe' in names
print('PASS: public Windows ZIP, version, EXE, runtime and all file checksums')
