import Ember from "ember";
import QueueItem from "../models/queue-item";

export default Ember.Service.extend(Ember.Evented, {

  autoSave: true,
  delay: 1000,
  maxRetries: 5,
  retryDelay: 10000,

  isSaving: false,
  isOnline: true,
  length: Ember.computed.reads("queue.length"),

  wasSaving: false,

  init() {
    Ember.$(window).on("online offline", Ember.$.proxy(this.handleNetwork, this));
  },

  willDestroy() {
    Ember.$(window).off("online offline", this.handleNetwork);
  },

  enqueue(...models) {
    let queue = this.get("queue");
    models.forEach((model) => {
      queue.removeObjects(
        Ember.A(queue.filterBy("model", model)).invoke("destroy")
      );
      queue.pushObject(QueueItem.create({
        model: model,
        saveQueue: this
      }));
    });
    if (this.get("autoSave")) {
      this.saveNext();
    }
  },

  dequeue(...models) {
    let queue = this.get("queue");
    models.forEach((model) => {
      queue.removeObjects(
        Ember.A(queue.filterBy("model", model)).invoke("destroy")
      );
    });
  },

  clear() {
    this.get("queue").invoke("destroy");
    this.get("queue").clear();
  },

  save() {
    this.saveNext();
  },

  saveNext() {
    if (this.get("isSaving") || !this.get("isOnline")) {
      return;
    }

    let queue = this.get("queue");
    let item = queue.objectAt(0);

    if (item) {
      if (item.get("canSave")) {
        this.set("isSaving", true);
        this.set("wasSaving", true);
        item.model.save().then(() => {
          this.set("isSaving", false);
          if (!item.get("model.hasDirtyAttributes")) {
            queue.removeObject(item.destroy());
          }
          this.saveNext();
        }, (error) => {
          this.set("isSaving", false);
          if (item.get("retryCount") < this.get("maxRetries")) {
            if (this.shouldRetry(error)) {
              item.scheduleRetry();
            }
          } else {
            queue.removeObject(item.destroy());
            this.trigger("error", item.model);
          }
          this.saveNext();
        });
      }
    } else if(this.get("wasSaving")) {
      this.set("wasSaving", false);
      this.trigger("complete");
    }
  },

  shouldRetry(error) {
    return true;
  },

  queue: Ember.computed(function() {
    return Ember.A();
  }),

  autoSaveAfterCanSave: Ember.observer("autoSave", "queue.@each.canSave",
    function() {
    if (this.get("autoSave")) {
      this.saveNext();
    }
  }),

  handleNetwork(event) {
    switch (event.type) {
      case "offline":
        this.set("isOnline", false);
        break;
      case "online":
        this.set("isOnline", true);
        this.saveNext();
        break;
    }
  }
});
