import BufferMixin from 'ember-save-queue/mixins/buffer';
import { module, test } from 'qunit';
import { setupStore } from '../../helpers/store';
import Ember from "ember";
import DS from "ember-data";

var Person, store, env;

module('Unit | Mixin | buffer', {
  beforeEach() {
    Person = DS.Model.extend(BufferMixin, {
      firstName: DS.attr('string'),
      lastName:  DS.attr('string'),
      fullName: Ember.computed("firstName", "lastName", function() {
        return this.get("firstName") + " " + this.get("lastName");
      })
    });

    env = setupStore({
      person: Person
    });
    store = env.store;
  },

  afterEach() {
    Ember.run(function() {
      store.destroy();
    });
    Person = null;
    store = null;
  }
});

test('it adds buffer property to a model', function(assert) {
  let subject;
  Ember.run(function() {
    subject = store.createRecord("person");
  });
  assert.ok(subject.get("buffer"));
});

test("it proxies record's attributes", function(assert) {
  let record, buffer;
  Ember.run(function() {
    record = store.createRecord("person", {
      firstName: "John",
      lastName: "Smith"
    });
    buffer = record.get("buffer");
  });
  assert.equal(buffer.get("firstName"), "John", "should return original value if buffer's value is not set");
  assert.equal(buffer.get("fullName"), "John Smith", "should return original computed property value if buffer's value is not set");

  Ember.run(function() {
    buffer.set("firstName", "Jack");
  });
  assert.equal(buffer.get("firstName"), "Jack", "should return new value after buffer's value is set");
  assert.equal(buffer.get("fullName"), "Jack Smith", "should return new computed property value after buffer's value is set");
  assert.equal(record.get("firstName"), "John", "should not change the original value after buffer's value is set");
  assert.equal(record.get("fullName"), "John Smith", "should not change the original computed property value after buffer's value not set");
});

test("it applies buffered changes", function(assert) {
  let record, buffer;
  Ember.run(function() {
    record = store.createRecord("person", {
      firstName: "John",
      lastName: "Smith"
    });
    buffer = record.get("buffer");
    buffer.set("firstName", "Jack");
    record.applyBufferedChanges();
  });

  assert.equal(buffer.get("firstName"), "Jack", "buffer should return new value after buffer changes are applied");
  assert.equal(record.get("firstName"), "Jack", "record should return new value after buffer changes are applied");
});

test("it discards buffered changes", function(assert) {
  let record, buffer;
  Ember.run(function() {
    record = store.createRecord("person", {
      firstName: "John",
      lastName: "Smith"
    });
    buffer = record.get("buffer");
    buffer.set("firstName", "Jack");
    record.discardBufferedChanges();
  });

  assert.equal(buffer.get("firstName"), "John", "buffer should return original value after buffer changes are applied");
  assert.equal(record.get("firstName"), "John", "record should return original value after buffer changes are applied");
});
