document.write('<script src="http://' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1"></' + 'script>');
(function () {
'use strict';

function h(tag, data) {
  var node;
  var stack = [];
  var children = [];

  for (var i = arguments.length; i-- > 2;) {
    stack[stack.length] = arguments[i];
  }

  while (stack.length) {
    if (Array.isArray(node = stack.pop())) {
      for (var i = node.length; i--;) {
        stack[stack.length] = node[i];
      }
    } else if (node != null && node !== true && node !== false) {
      if (typeof node === "number") {
        node = node + "";
      }
      children[children.length] = node;
    }
  }

  return typeof tag === "string" ? {
    tag: tag,
    data: data || {},
    children: children
  } : tag(data, children);
}

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};

function app(app) {
  var state = {};
  var actions = {};
  var events = {};
  var mixins = [];
  var view = app.view;
  var root = app.root || document.body;
  var node;
  var element;
  var locked = false;
  var loaded = false;

  for (var i = -1; i < mixins.length; i++) {
    var mixin = mixins[i] ? mixins[i](emit) : app;

    Object.keys(mixin.events || []).map(function (key) {
      events[key] = (events[key] || []).concat(mixin.events[key]);
    });

    if (mixin.state != null) {
      state = merge(state, mixin.state);
    }

    mixins = mixins.concat(mixin.mixins || []);

    initialize(actions, mixin.actions);
  }

  node = hydrate(element = root.querySelector("[data-ssr]"), [].map);

  repaint(emit("init"));

  return emit;

  function repaint() {
    if (!locked) {
      requestAnimationFrame(render, locked = !locked);
    }
  }

  function hydrate(element, map) {
    return element == null ? element : {
      tag: element.tagName,
      data: {},
      children: map.call(element.childNodes, function (element) {
        hydrate(element, map);
      })
    };
  }

  function render() {
    element = patch(root, element, node, node = emit("render", view)(state, actions));

    locked = !locked;

    if (!loaded) {
      emit("loaded", loaded = true);
    }
  }

  function initialize(namespace, children, lastName) {
    Object.keys(children || []).map(function (key) {
      var action = children[key];
      var name = lastName ? lastName + "." + key : key;

      if (typeof action === "function") {
        namespace[key] = function (data) {
          var result = action(state, actions, emit("action", {
            name: name,
            data: data
          }).data);

          if (result != null && result.then == null) {
            repaint(state = merge(state, emit("update", result)));
          }

          return result;
        };
      } else {
        initialize(namespace[key] || (namespace[key] = {}), action, name);
      }
    });
  }

  function emit(name, data) {
    (events[name] || []).map(function (cb) {
      var result = cb(state, actions, data);
      if (result != null) {
        data = result;
      }
    });

    return data;
  }

  function merge(a, b) {
    if ((typeof b === "undefined" ? "undefined" : _typeof(b)) !== "object") {
      return b;
    }

    var obj = {};

    for (var i in a) {
      obj[i] = a[i];
    }

    for (var i in b) {
      obj[i] = b[i];
    }

    return obj;
  }

  function createElement(node, isSVG) {
    if (typeof node === "string") {
      var element = document.createTextNode(node);
    } else {
      var element = (isSVG = isSVG || node.tag === "svg") ? document.createElementNS("http://www.w3.org/2000/svg", node.tag) : document.createElement(node.tag);

      for (var i = 0; i < node.children.length;) {
        element.appendChild(createElement(node.children[i++], isSVG));
      }

      for (var i in node.data) {
        if (i === "oncreate") {
          node.data[i](element);
        } else if (i === "oninsert") {
          setTimeout(node.data[i], 0, element);
        } else {
          setElementData(element, i, node.data[i]);
        }
      }
    }

    return element;
  }

  function setElementData(element, name, value, oldValue) {
    if (name === "key") {} else if (name === "style") {
      for (var i in merge(oldValue, value = value || {})) {
        element.style[i] = value[i] || "";
      }
    } else {
      try {
        element[name] = value;
      } catch (_) {}

      if (typeof value !== "function") {
        if (value) {
          element.setAttribute(name, value);
        } else {
          element.removeAttribute(name);
        }
      }
    }
  }

  function updateElementData(element, oldData, data) {
    for (var name in merge(oldData, data)) {
      var value = data[name];
      var oldValue = name === "value" || name === "checked" ? element[name] : oldData[name];

      if (name === "onupdate" && value) {
        value(element);
      } else if (value !== oldValue) {
        setElementData(element, name, value, oldValue);
      }
    }
  }

  function getKey(node) {
    if (node && (node = node.data)) {
      return node.key;
    }
  }

  function removeElement(parent, element, node) {
    (node.data && node.data.onremove || removeChild)(element, removeChild);
    function removeChild() {
      parent.removeChild(element);
    }
  }

  function patch(parent, element, oldNode, node) {
    if (oldNode == null) {
      element = parent.insertBefore(createElement(node), element);
    } else if (node.tag && node.tag === oldNode.tag) {
      updateElementData(element, oldNode.data, node.data);

      var len = node.children.length;
      var oldLen = oldNode.children.length;
      var reusableChildren = {};
      var oldElements = [];
      var newKeys = {};

      for (var i = 0; i < oldLen; i++) {
        var oldElement = element.childNodes[i];
        oldElements[i] = oldElement;

        var oldChild = oldNode.children[i];
        var oldKey = getKey(oldChild);

        if (null != oldKey) {
          reusableChildren[oldKey] = [oldElement, oldChild];
        }
      }

      var i = 0;
      var j = 0;

      while (j < len) {
        var oldElement = oldElements[i];
        var oldChild = oldNode.children[i];
        var newChild = node.children[j];

        var oldKey = getKey(oldChild);
        if (newKeys[oldKey]) {
          i++;
          continue;
        }

        var newKey = getKey(newChild);

        var reusableChild = reusableChildren[newKey] || [];

        if (null == newKey) {
          if (null == oldKey) {
            patch(element, oldElement, oldChild, newChild);
            j++;
          }
          i++;
        } else {
          if (oldKey === newKey) {
            patch(element, reusableChild[0], reusableChild[1], newChild);
            i++;
          } else if (reusableChild[0]) {
            element.insertBefore(reusableChild[0], oldElement);
            patch(element, reusableChild[0], reusableChild[1], newChild);
          } else {
            patch(element, oldElement, null, newChild);
          }

          j++;
          newKeys[newKey] = newChild;
        }
      }

      while (i < oldLen) {
        var oldChild = oldNode.children[i];
        var oldKey = getKey(oldChild);
        if (null == oldKey) {
          removeElement(element, oldElements[i], oldChild);
        }
        i++;
      }

      for (var i in reusableChildren) {
        var reusableChild = reusableChildren[i];
        var reusableNode = reusableChild[1];
        if (!newKeys[reusableNode.data.key]) {
          removeElement(element, reusableChild[0], reusableNode);
        }
      }
    } else if (node !== oldNode) {
      var i = element;
      parent.replaceChild(element = createElement(node), i);
    }

    return element;
  }
}

var Selection = function Selection(_ref) {
    var state = _ref.state,
        actions = _ref.actions;

    var name = '';
    if (state.selectedAircraft !== null) {
        name = state.selectedAircraft.name;
    }
    return h(
        "section",
        null,
        h(
            "select",
            { value: name,
                onchange: function onchange(event) {
                    actions.chooseAircraft(event.target.value);
                }
            },
            state.aircraft.map(function (aircraft) {
                return h(
                    "option",
                    { value: aircraft.name },
                    aircraft.name
                );
            })
        )
    );
};

function Main(_ref2) {
    var state = _ref2.state,
        actions = _ref2.actions;

    if (state.selectedAircraft != null) {
        return h(
            "main",
            null,
            h(
                "h1",
                null,
                state.selectedAircraft.name
            ),
            h("object", { type: "image/svg+xml", id: "svg", data: 'aircraft/' + state.selectedAircraft.image }),
            h(Selection, { state: state, actions: actions }),
            state.selectedAircraft.procedures.map(function (procedure) {
                return h(List, { list: procedure });
            }),
            state.selectedAircraft.systems.map(function (system) {
                return h(List, { list: system });
            })
        );
    } else {
        return h(Selection, { state: state, actions: actions });
    }
}

function List(_ref3) {
    var list = _ref3.list;

    return h(
        "section",
        null,
        h(
            "h1",
            null,
            list.name
        ),
        h(
            "dl",
            null,
            list.items.map(function (item) {
                return Object.keys(item).map(function (key) {
                    return Item(item, key);
                });
            })
        )
    );
}

function Item(item, name) {
    return [h(
        "dt",
        null,
        name
    ), h(
        "dd",
        null,
        item[name]
    )];
}

app({
    state: {
        aircraft: [],
        selectedAircraft: null
    },

    view: function view(state, actions) {
        return h(Main, { state: state, actions: actions, electedAircraft: state.selectedAircraft });
    },

    actions: {
        loadIndex: function loadIndex(state, actions) {
            fetch('/aircraft/index.json').then(function (response) {
                return response.json();
            }).then(function (json) {
                return json.map(function (path) {
                    return fetch("/aircraft/" + path).then(function (response) {
                        return response.json();
                    }).then(function (json) {
                        return actions.updateAircraft(json);
                    });
                });
            });
        },

        updateAircraft: function updateAircraft(state, actions, json) {
            state.aircraft.push(json);
            state.aircraft.sort();
            return { aircraft: state.aircraft };
        },

        chooseAircraft: function chooseAircraft(state, actions, choice) {
            return { selectedAircraft: state.aircraft.filter(function (value) {
                    return value.name == choice;
                })[0] };
        }
    },

    events: {
        loaded: function loaded(state, actions) {
            actions.loadIndex();
        }
    }
});

}());
