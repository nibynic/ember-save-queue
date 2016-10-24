import Ember from "ember";

export default Ember.Object.extend({
  isReady: false,
  attemptCount: 0,

  canSave: Ember.computed.and("isReady", "modelCanSave"),

  modelCanSave: Ember.computed.not("model.isSaving"),

  init() {
    let delay = this.get("saveQueue.delay");
    if (delay) {
      this.laterRun = Ember.run.later(
        this, this.makeReady, delay
      );
    } else {
      this.makeReady();
    }    
    this._super(...arguments);
  },

  willDestroy() {
    Ember.run.cancel(this.laterRun);
    this._super(...arguments);
  },

  makeReady() {
    this.set("isReady", true);
  }
});
