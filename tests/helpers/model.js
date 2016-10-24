import Ember from "ember";

export default Ember.Object.extend({
  save() {
    return new Ember.RSVP.resolve();
  },

  hasDirtyAttributes: false
});
