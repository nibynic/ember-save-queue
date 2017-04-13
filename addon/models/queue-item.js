import Ember from "ember";

export default Ember.Object.extend({
  isReady: false,
  retryCount: 0,

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

  scheduleRetry() {
    let delay = Math.pow(2, this.get("retryCount")) * this.get("saveQueue.retryDelay");

    this.incrementProperty("retryCount");
    this.set("isReady", false);

    Ember.run.cancel(this.laterRun);
    this.laterRun = Ember.run.later(this, this.makeReady, delay);
  },

  makeReady() {
    this.set("isReady", true);
  }
});
