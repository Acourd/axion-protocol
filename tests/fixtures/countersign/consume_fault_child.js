'use strict';

const fs = require('fs');
const V1 = require('../../../tools/countersign_bootstrap.js');

const [targetRoot, envelopePath, registryPath, authoritiesPath] = process.argv.slice(2);
const envelope = JSON.parse(fs.readFileSync(envelopePath, 'utf8'));
const result = V1.consumeCountersignature({
  targetRoot,
  envelope,
  registryPath,
  authorityRegistryPath: authoritiesPath,
  options: { faultInjection: 'after-marker-write-kill' }
});
console.log(JSON.stringify(result));
