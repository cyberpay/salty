var assert = require('assert')
  , fs = require('fs')
  , path = require('path')
  , crypto = require('crypto')
  , rimraf = require('rimraf')
  , child_process = require('child_process')
  , suppose = require('suppose')
  , tmpDir = path.join(require('os').tmpDir(), Math.random().toString(36).slice(2))
  , BIN = path.join(__dirname, '..', 'bin', 'salty')
  , request = require('micro-request')

describe('tests', function () {
  var p = path.join(tmpDir, 'alice.jpg')

  before(function () {
    fs.mkdirSync(tmpDir)
    if (!process.env.DEBUG) {
      process.on('exit', function () {
        rimraf.sync(tmpDir)
      })
    }
    else console.log('tmpDir', tmpDir)
  })

  it('stream fixture', function (done) {
    request('https://raw.githubusercontent.com/carlos8f/node-buffet/master/test/files/folder/Alice-white-rabbit.jpg', {stream: true}, function (err, resp, body) {
      assert.ifError(err)
      body.pipe(fs.createWriteStream(p))
        .once('finish', done)
    })
  })
  it('verify stream fixture', function (done) {
    fs.createReadStream(p)
      .pipe(crypto.createHash('sha1'))
      .on('data', function (data) {
        assert.equal(data.toString('hex'), '2bce2ffc40e0d90afe577a76db5db4290c48ddf4')
        done()
      })
  })
  it('set up alice', function (done) {
    suppose(BIN, ['init', '--wallet', 'alice'], {cwd: tmpDir})
      .when('Creating new salty-wallet...\nYour name: ').respond('Alice\n')
      .when('Your email address: ').respond('alice@s8f.org\n')
      .when('Create a passphrase: ').respond('disney sucks\n')
      .when('Verify passphrase: ').respond('disney sucks\n')
      .end(function (code) {
        assert(!code)
        done()
      })
  })
  it('set up bob', function (done) {
    suppose(BIN, ['init', '--wallet', 'bob'], {cwd: tmpDir})
      .when('Creating new salty-wallet...\nYour name: ').respond('Bob\n')
      .when('Your email address: ').respond('bob@s8f.org\n')
      .when('Create a passphrase: ').respond('i am bob\n')
      .when('Verify passphrase: ').respond('i am bob\n')
      .end(function (code) {
        assert(!code)
        done()
      })
  })
  var alice_pubkey
  it('alice pubkey', function (done) {
    var chunks = []
    suppose(BIN, ['pubkey', '--wallet', 'alice'], {cwd: tmpDir, debug: fs.createWriteStream('/tmp/debug.txt')})
      .end(function (code) {
        assert(!code)
      })
      .stdout.on('data', function (chunk) {
        chunks.push(chunk)
      })
      .once('end', function () {
        var stdout = Buffer.concat(chunks).toString('utf8')
        var match = stdout.match(/salty\-id ([a-zA-Z0-9-\_]+)\s*(?:"([^"]*)")?\s*(?:<([^>]*)>)?/)
        assert(match)
        alice_pubkey = match[0]
        done()
      })
  })
  it('alice change password', function (done) {
    suppose(BIN, ['init', '--wallet', 'alice'], {cwd: tmpDir, debug: fs.createWriteStream('/tmp/debug.txt')})
      .when('Salty-wallet exists. Update it? (y/n): ').respond('y\n')
      .when('Salty-wallet is encrypted.\nEnter passphrase: ').respond('disney sucks\n')
      .when('Your name: (Alice) ').respond('\n')
      .when('Your email address: (alice@s8f.org) ').respond('\n')
      .when('Create a passphrase: ').respond('not a blonde\n')
      .when('Verify passphrase: ').respond('not a blonde\n')
      .end(function (code) {
        assert(!code)
        done()
      })
  })
  var bob_pubkey
  it('bob pubkey', function (done) {
    var chunks = []
    suppose(BIN, ['pubkey', '--wallet', 'bob'], {cwd: tmpDir, debug: fs.createWriteStream('/tmp/debug.txt')})
      .end(function (code) {
        assert(!code)
      })
      .stdout.on('data', function (chunk) {
        chunks.push(chunk)
      })
      .once('end', function () {
        var stdout = Buffer.concat(chunks).toString('utf8')
        var match = stdout.match(/salty\-id ([a-zA-Z0-9-\_]+)\s*(?:"([^"]*)")?\s*(?:<([^>]*)>)?/)
        assert(match)
        bob_pubkey = match[0]
        done()
      })
  })
  it('alice import bob', function (done) {
    var chunks = []
    var proc = suppose(BIN, ['import', '--wallet', 'alice', bob_pubkey], {cwd: tmpDir, debug: fs.createWriteStream('/tmp/debug.txt')})
      .end(function (code) {
        assert(!code)
      })

    proc.stderr.pipe(process.stderr)

    proc
      .stdout.on('data', function (chunk) {
        chunks.push(chunk)
      })
      .once('end', function () {
        var stdout = Buffer.concat(chunks).toString('utf8')
        console.error('stdout', stdout)
        var match = stdout.match(/salty\-id ([a-zA-Z0-9-\_]+)\s*(?:"([^"]*)")?\s*(?:<([^>]*)>)?/)
        assert(match)
        assert.equal(match[0], bob_pubkey)
        done()
      })
  })
  it('alice ls', function (done) {
    var chunks = []
    suppose(BIN, ['import', '--wallet', 'alice', bob_pubkey], {cwd: tmpDir, debug: fs.createWriteStream('/tmp/debug.txt')})
      .end(function (code) {
        assert(!code)
      })
      .stdout.on('data', function (chunk) {
        chunks.push(chunk)
      })
      .once('end', function () {
        var stdout = Buffer.concat(chunks).toString('utf8')
        var match = stdout.match(/salty\-id ([a-zA-Z0-9-\_]+)\s*(?:"([^"]*)")?\s*(?:<([^>]*)>)?/g)
        assert(match)
        assert.equal(match[0], alice_pubkey)
        assert.equal(match[1], bob_pubkey)
        done()
      })
  })
  it.skip('alice save', function (done) {

  })
  it.skip('alice destroy', function (done) {

  })
  it.skip('alice restore', function (done) {

  })
  it.skip('alice encrypt for bob (no sign)', function (done) {

  })
  it.skip('bob decrypt', function (done) {

  })
  it.skip('alice encrypt for bob (sign)', function (done) {

  })
  it.skip('bob decrypt', function (done) {

  })
  it.skip('alice encrypt for bob (armor)', function (done) {

  })
  it.skip('bob decrypt', function (done) {

  })
  it.skip('alice encrypt for bob (compose)', function (done) {

  })
  it.skip('bob decrypt', function (done) {

  })
  it.skip('alice sign', function (done) {

  })
  it.skip('bob verify', function (done) {

  })

  /* errors
    - init over existing dir
    - import error
    - restore bad pw
    - open wallet bad pw
    - encrypt noent, encrypt bad recip
    - decrypt noent
    - decrypt fail (bad hash, bad sig, box open)
    - verify fail

    edge cases
    - init in home/specified dir
    - init without email
    - init without name
    - weird chars in id?
    - import from url/file
    - encrypt for self
    - force flag
    - armor flag
    - delete flag
    - sign/verify path detection
  */
})