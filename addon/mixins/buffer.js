import Ember from 'ember';

function bufferedAttribute(name) {
  return Ember.computed(`_attributes.${name}`, `content.${name}`,
    `content.secondaryBuffer.${name}`, {
    get() {
      let value = this.get(`_attributes.${name}`);
      if (value !== undefined) { return value; }
      value = this.get(`content.secondaryBuffer.${name}`);
      if (value !== undefined) { return value; }
      return this.get(`content.${name}`);
    },
    set(key, value) {
      this.set(`_attributes.${name}`, value);
      return value;
    }
  });
}

function bufferedBelongsTo(name) {
  return Ember.computed.reads(`content.${name}.buffer`);
}

function bufferedHasMany(name) {
  return Ember.computed.mapBy(`content.${name}`, "buffer");
}

export default Ember.Mixin.create({
  buffer: Ember.computed(function() {

    let props = {};
    this.constructor.eachAttribute((name) => {
      props[name] = bufferedAttribute(name);
    });
    this.constructor.eachRelationship((name, meta) => {
      if (meta.kind === "belongsTo") {
        props[name] = bufferedBelongsTo(name);
      } else {
        props[name] = bufferedHasMany(name);
      }
    });
    let mixins = this.constructor.PrototypeMixin.mixins.map((m) => {
      return m.properties;
    }).filter((m) => { return !!m; });
    return Ember.ObjectProxy.extend(...mixins, props).create({
      _attributes: {},
      modelName: this.constructor.modelName,
      content: this,
      applyBufferedChanges() {
        this.get("content").applyBufferedChanges();
      },
      discardBufferedChanges() {
        this.get("content").discardBufferedChanges();
      }
    });
  }),

  secondaryBuffer: Ember.computed(function() { return {}; }),

  applyBufferedChanges() {
    if (!this.get("isSaving")) {
      this.setProperties(this.get("buffer._attributes"));
    } else {
      this.set("secondaryBuffer", Ember.assign(
        {}, this.get("secondaryBuffer"), this.get("buffer._attributes")
      ));
      this.one("didCreate", this, this.applySecondaryBuffer);
      this.one("didUpdate", this, this.applySecondaryBuffer);
    }
    this.set("buffer._attributes", {});
  },

  discardBufferedChanges() {
    this.set("buffer._attributes", {});
  },

  applySecondaryBuffer() {
    this.setProperties(this.get("secondaryBuffer"));
    this.set("secondaryBuffer", {});
  }
});
