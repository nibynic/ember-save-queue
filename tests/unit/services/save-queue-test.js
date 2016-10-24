import Ember from "ember";
import { moduleFor, test } from 'ember-qunit';
import Model from "../../helpers/model";

moduleFor('service:save-queue', 'Unit | Service | save queue', {
  // Specify the other units that are required for this test.
  // needs: ['service:foo']
});


test("it enqueues & dequeues records", function(assert) {
  let service = this.subject();
  let record1 = Model.create();
  let record2 = Model.create();
  let record3 = Model.create();

  Ember.run(function() {
    service.enqueue(record1);
  });
  assert.equal(service.get("queue.lastObject.model"), record1, "should add the first record at the end");

  Ember.run(function() {
    service.enqueue(record2);
  });
  assert.equal(service.get("queue.lastObject.model"), record2, "should add the second record at the end");

  Ember.run(function() {
    service.enqueue(record1, record3);
  });
  assert.equal(service.get("queue.length"), 3, "there should be 3 records in the queue");
  assert.equal(service.get("queue").objectAt(1).get("model"), record1, "the first record should be at the second position in the queue");
  assert.equal(service.get("queue.lastObject.model"), record3, "should add the third record at the end");

  Ember.run(function() {
    service.dequeue(record2, record3);
  });
  assert.equal(service.get("queue.length"), 1, "there should be 1 record in the queue");
  assert.equal(service.get("queue.lastObject.model"), record1, "the first record should be at the end");
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
