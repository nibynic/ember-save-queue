import Ember from "ember";
import { moduleFor, test } from 'ember-qunit';
import Model from "../../helpers/model";
import sinon from "sinon";

moduleFor('service:save-queue', 'Unit | Service | save queue', {
  beforeEach() {
    this.sinon = sinon.sandbox.create();
  },

  afterEach() {
    this.sinon.restore();
  }
});


test("it enqueues & dequeues records", function(assert) {
  let service = this.subject();
  let record1 = Model.create();
  let record2 = Model.create();
  let record3 = Model.create();

  Ember.run(function() {
    service.enqueue(record1);
  });
  assert.equal(service.get("length"), 1, "should update queue length");
  assert.equal(service.get("queue.lastObject.model"), record1, "should add the first record at the end");

  Ember.run(function() {
    service.enqueue(record2);
  });
  assert.equal(service.get("queue.lastObject.model"), record2, "should add the second record at the end");

  Ember.run(function() {
    service.enqueue(record1, record3);
  });
  assert.equal(service.get("length"), 3, "there should be 3 records in the queue");
  assert.equal(service.get("queue").objectAt(1).get("model"), record1, "the first record should be at the second position in the queue");
  assert.equal(service.get("queue.lastObject.model"), record3, "should add the third record at the end");

  Ember.run(function() {
    service.dequeue(record2, record3);
  });
  assert.equal(service.get("length"), 1, "there should be 1 record in the queue");
  assert.equal(service.get("queue.lastObject.model"), record1, "the first record should be at the end");

  Ember.run(function() {
    service.clear();
  });
  assert.equal(service.get("length"), 0, "queue should be empty");
});

test("it performs immediate autosave", function(assert) {
  assert.expect(2);
  var didSave = false;

  let service = this.subject();
  let record1 = Model.extend({
    save() {
      assert.ok(true, "should call save method");
      didSave = true;
      return this._super();
    }
  }).create();

  Ember.run(function() {
    service.set("delay", 0);
    service.enqueue(record1);
  });

  assert.ok(didSave, "should start saving immediately");
});

test("it performs delayed autosave", function(assert) {
  assert.expect(2);
  var done = assert.async();
  var didSave = false;

  let service = this.subject();
  let record1 = Model.extend({
    save() {
      assert.ok(true, "should call save method with delay");
      didSave = true;
      done();
      return this._super();
    }
  }).create();

  Ember.run(function() {
    service.set("delay", 100);
    service.enqueue(record1);
  });

  assert.ok(!didSave, "should not start saving immediately");
});

test("it doesn't autosave until autoSave property is set true", function(assert) {
  assert.expect(3);
  var didSave = false;

  let service = this.subject();
  let record1 = Model.extend({
    save() {
      assert.ok(true, "should call save method");
      didSave = true;
      return this._super();
    }
  }).create();

  Ember.run(function() {
    service.set("delay", 0);
    service.set("autoSave", false);
    service.enqueue(record1);
  });

  assert.ok(!didSave, "should not start saving immediately");

  Ember.run(function() {
    service.set("autoSave", true);
  });

  assert.ok(didSave, "should start saving");
});

test("it dequeues record after save", function(assert) {
  let service = this.subject();
  let record1 = Model.create();

  Ember.run(function() {
    service.set("delay", 0);
    service.set("autoSave", false);
    service.enqueue(record1);
  });
  assert.equal(service.get("queue.length"), 1, "queue should contain one record");

  Ember.run(function() {
    service.save();
  });
  assert.equal(service.get("queue.length"), 0, "queue should be empty");
});

test("it re-enqueues record if after save it still has some dirty attributes", function(assert) {
  assert.expect(2);
  var done = assert.async();

  let service = this.subject();
  let record1 = Model.extend({
    save() {
      assert.ok(true, "should call save method with delay");
      this.set("hasDirtyAttributes", !this.get("hasDirtyAttributes"));
      if (!this.get("hasDirtyAttributes")) {
        done();
      }
      return this._super();
    }
  }).create();

  Ember.run(function() {
    service.set("delay", 0);
    service.enqueue(record1);
  });
});

test("it repeats save on failure", function(assert) {
  let saveCount = 0, eventCount = 0;

  let service = this.subject();
  service.on("error", function() {
    eventCount++;
  });

  let record1 = Model.extend({
    save() {
      saveCount++;
      return Ember.RSVP.reject();
    }
  }).create();

  let delays = [];
  this.sinon.stub(Ember.run, "later").callsFake((context, method, delay) => {
    delays.push(delay);
    method.apply(context);
    return Math.random();
  });

  Ember.run(function() {
    service.set("delay", 0);
    service.set("autoSave", false);
    service.set("maxRetries", 5);
    service.set("retryDelay", 2);
    service.enqueue(record1);
  });

  Ember.run(function() {
    service.save();
  });

  assert.equal(saveCount, 6, "should try to save 6 times");
  assert.equal(eventCount, 1, "should trigger error event 1 time");
  assert.deepEqual(delays, [2, 4, 8, 16, 32], "should increase delay over time");
});

test("it detects offline state and halts saving until reconnecting", function(assert) {
  let service = this.subject();
  service.set("isOnline", true);

  $(window).trigger("offline");
  assert.equal(service.get("isOnline"), false, "should be marked as offline");

  let saveSpy = this.sinon.spy(service, "saveNext");
  $(window).trigger("online");
  assert.equal(service.get("isOnline"), true, "should be marked as online");
  this.sinon.assert.called(saveSpy);
});

test("it triggers events", function(assert) {
  let service = this.subject();
  let completeCount = 0;
  let record1 = Model.create();

  service.on("complete", function() {
    completeCount++;
  });

  Ember.run(function() {
    service.set("delay", 0);
    service.enqueue(record1);
  });

  assert.equal(completeCount, 1, "should trigger complete event exactly one time");
});
