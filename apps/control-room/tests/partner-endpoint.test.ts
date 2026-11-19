import test from 'node:test';
import assert from 'node:assert/strict';
import {partnerEndpoint} from '../src/partner-endpoint.ts';

test('the published page uses only a configured HTTPS origin; the local package keeps its own server',()=>{
 const pages={hostname:'limmin3-sudo.github.io',pathname:'/stam-freight-control/'};
 const worker='https://stam-partner-chat.example.workers.dev';
 assert.equal(partnerEndpoint(pages,worker+'/'),worker+'/api/partner-guide');
 for(const value of [undefined,'http://insecure.example','https://user@other.example','https://other.example/path','https://other.example/?token=abc'])
  assert.equal(partnerEndpoint(pages,value),null);
 assert.equal(partnerEndpoint({hostname:'127.0.0.1',pathname:'/apps/control-room/dist/index.html'},worker),'/api/partner-guide');
});
