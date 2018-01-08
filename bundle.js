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
    return (events[name] || []).map(function (cb) {
      var result = cb(state, actions, data);
      if (result != null) {
        data = result;
      }
    }), data;
  }

  function merge(a, b) {
    if (typeof b !== "object") {
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

  function getKey(node) {
    if (node && (node = node.data)) {
      return node.key;
    }
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
    if (name === "key" || name === "oncreate" || name === "oninsert" || name === "onupdate" || name === "onremove") {
      return name;
    } else if (name === "style") {
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

  function updateElementData(element, oldData, data, cb) {
    for (var name in merge(oldData, data)) {
      var value = data[name];
      var oldValue = oldData[name];

      if (value !== oldValue && value !== element[name] && setElementData(element, name, value, oldValue) == null) {
        cb = data.onupdate;
      }
    }

    if (cb != null) {
      cb(element);
    }
  }

  function removeElement(parent, element, data) {
    if (data && data.onremove) {
      data.onremove(element);
    } else {
      parent.removeChild(element);
    }
  }

  function patch(parent, element, oldNode, node, isSVG, lastElement) {
    if (oldNode == null) {
      element = parent.insertBefore(createElement(node, isSVG), element);
    } else if (node.tag != null && node.tag === oldNode.tag) {
      updateElementData(element, oldNode.data, node.data);

      isSVG = isSVG || node.tag === "svg";

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
            patch(element, oldElement, oldChild, newChild, isSVG);
            j++;
          }
          i++;
        } else {
          if (oldKey === newKey) {
            patch(element, reusableChild[0], reusableChild[1], newChild, isSVG);
            i++;
          } else if (reusableChild[0]) {
            element.insertBefore(reusableChild[0], oldElement);
            patch(element, reusableChild[0], reusableChild[1], newChild, isSVG);
          } else {
            patch(element, oldElement, null, newChild, isSVG);
          }

          j++;
          newKeys[newKey] = newChild;
        }
      }

      while (i < oldLen) {
        var oldChild = oldNode.children[i];
        var oldKey = getKey(oldChild);
        if (null == oldKey) {
          removeElement(element, oldElements[i], oldChild.data);
        }
        i++;
      }

      for (var i in reusableChildren) {
        var reusableChild = reusableChildren[i];
        var reusableNode = reusableChild[1];
        if (!newKeys[reusableNode.data.key]) {
          removeElement(element, reusableChild[0], reusableNode.data);
        }
      }
    } else if ((lastElement = element) != null && node !== oldNode && node !== element.nodeValue) {
      parent.replaceChild(element = createElement(node, isSVG), lastElement);
    }

    return element;
  }
}

var index = typeof fetch == 'function' ? fetch.bind() : function (url, options) {
	options = options || {};
	return new Promise(function (resolve, reject) {
		var request = new XMLHttpRequest();

		request.open(options.method || 'get', url);

		for (var i in options.headers) {
			request.setRequestHeader(i, options.headers[i]);
		}

		request.withCredentials = options.credentials == 'include';

		request.onload = function () {
			resolve(response());
		};

		request.onerror = reject;

		request.send(options.body);

		function response() {
			var keys = [],
			    all = [],
			    headers = {},
			    header;

			request.getAllResponseHeaders().replace(/^(.*?):\s*([\s\S]*?)$/gm, function (m, key, value) {
				keys.push(key = key.toLowerCase());
				all.push([key, value]);
				header = headers[key];
				headers[key] = header ? header + "," + value : value;
			});

			return {
				ok: (request.status / 200 | 0) == 1, // 200-299
				status: request.status,
				statusText: request.statusText,
				url: request.responseURL,
				clone: response,
				text: function () {
					return Promise.resolve(request.responseText);
				},
				json: function () {
					return Promise.resolve(request.responseText).then(JSON.parse);
				},
				blob: function () {
					return Promise.resolve(new Blob([request.response]));
				},
				headers: {
					keys: function () {
						return keys;
					},
					entries: function () {
						return all;
					},
					get: function (n) {
						return headers[n.toLowerCase()];
					},
					has: function (n) {
						return n.toLowerCase() in headers;
					}
				}
			};
		}
	});
};


//# sourceMappingURL=unfetch.es.js.map

const Selection = ({ state, actions }) => {
    let name = state.selectedAircraft ? state.selectedAircraft.name : '';
    return h(
        'section',
        null,
        h(
            'h1',
            null,
            'Aircraft'
        ),
        h(
            'ul',
            null,
            state.aircraft.map(aircraft => h(
                'li',
                null,
                h(
                    'a',
                    { onclick: _ => actions.chooseAircraft(aircraft.name) },
                    aircraft.name
                )
            ))
        )
    );
};

const CloseButton = ({ actions }) => h(
    'a',
    { 'class': 'closeButton', onclick: _ => actions.chooseAircraft() },
    '\u2715'
);

const Main = ({ state, actions }) => {
    if (state.selectedAircraft != null) {
        return h(
            'main',
            null,
            h(CloseButton, { actions: actions }),
            h(
                'h1',
                null,
                state.selectedAircraft.name
            ),
            h('object', { type: 'image/svg+xml', id: 'svg', data: `aircraft/${state.selectedAircraft.image}` }),
            state.selectedAircraft.procedures.concat(state.selectedAircraft.systems).map((item, index$$1) => h(
                Transition,
                { delay: index$$1 * 0.15 },
                h(List, { list: item })
            )),
            h(
                'a',
                { 'class': 'bvr', href: 'https://bvr.design' },
                h('img', { src: './bvr.png' })
            )
        );
    } else {
        return h(
            'main',
            null,
            h(Selection, { state: state, actions: actions }),
            h(
                'a',
                { 'class': 'bvr', href: 'https://bvr.design' },
                h('img', { src: './bvr.png' })
            )
        );
    }
};

const List = ({ className, list }) => h(
    'section',
    { 'class': className },
    h(
        'h1',
        null,
        list.name
    ),
    h(
        'table',
        null,
        list.items.map(item => Object.keys(item).map(key => ListItem(item, key)))
    )
);

const ListItem = (item, name) => h(
    'tr',
    null,
    h(
        'td',
        null,
        name
    ),
    h(
        'td',
        null,
        item[name]
    )
);

const Transition = (props, children) => {
    const reverses = Object.keys(props || {}).filter(k => k == 'reverses').length != 0;
    const duration = `duration` in (props || {}) ? props.duration : 0.15;
    const delay = `delay` in (props || {}) ? props.delay : 0;

    const animatedChildren = children.map(child => {
        child.data.style = {
            transitionDuration: `${duration}s`,
            transitionDelay: `${delay}s`
        };

        child.data.oncreate = element => {
            element.className = 'transition-start';
        };

        child.data.oninsert = element => {
            element.className = 'transition-end';
        };

        if (reverses) {
            function handleTransitionEnd(event) {
                if (event.target.parentNode) {
                    event.target.parentNode.removeChild(event.target);
                }
                event.target.removeEventListener('transitionend', handleTransitionEnd, false);
            }

            child.data.onremove = element => {
                element.className = 'transition-start';
                element.addEventListener('transitionend', handleTransitionEnd, false);
            };
        }
        return child;
    });

    return animatedChildren;
};

app({
    state: {
        aircraft: [],
        selectedAircraft: null
    },

    view: (state, actions) => {
        return h(Main, { state: state, actions: actions, electedAircraft: state.selectedAircraft });
    },

    actions: {
        loadIndex: (state, actions) => {
            index('./aircraft/index.json').then(response => response.json()).then(json => json.map(path => index(`./aircraft/${path}.json`).then(response => response.json()).then(json => actions.updateAircraft(json))));
        },

        updateAircraft: (state, actions, json) => {
            state.aircraft.push(json);
            state.aircraft.sort((a, b) => {
                const nameA = a.name.toLowerCase();
                const nameB = b.name.toLowerCase();
                if (nameA < nameB) {
                    return -1;
                }
                if (nameA > nameB) {
                    return 1;
                }
                return 0;
            });
            return { aircraft: state.aircraft };
        },

        chooseAircraft: (state, actions, choice) => {
            const aircraft = choice !== undefined ? state.aircraft.filter(value => value.name == choice)[0] : null;
            return { selectedAircraft: aircraft };
        }
    },

    events: {
        loaded: (state, actions) => {
            actions.loadIndex();
        }
    }
});

}());
