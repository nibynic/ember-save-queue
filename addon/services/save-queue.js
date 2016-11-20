import Ember from "ember";
import QueueItem from "../models/queue-item";

export default Ember.Service.extend(Ember.Evented, {

  autoSave: true,
  delay: 1000,

  isSaving: false,

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

  save() {
    this.saveNext();
  },

  saveNext() {
    if (this.get("isSaving")) {
      return;
    }

    let queue = this.get("queue");
    let item = queue.objectAt(0);

    if (item) {
      if (item.get("canSave")) {
        this.set("isSaving", true);
        item.model.save().then(() => {
          this.set("isSaving", false);
          if (!item.get("model.hasDirtyAttributes")) {
            queue.removeObject(item.destroy());
          }
          this.saveNext();
        }, () => {
          this.set("isSaving", false);
          if (item.attemptCount < 4) {
            item.attemptCount++;
          } else {
            queue.removeObject(item.destroy());
            this.trigger("error", item.model);
          }
          this.saveNext();
        });
      }
    }
  },

  queue: Ember.computed(function() {
    return Ember.A();
  }),

  autoSaveAfterCanSave: Ember.observer("autoSave", "queue.@each.canSave",
    function() {
    if (this.get("autoSave")) {
      this.saveNext();
    }
  })
});
