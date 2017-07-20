import { h, app } from "hyperapp"

const Selection = ({ state, actions }) => {
    let name = state.selectedAircraft ? state.selectedAircraft.name : ''
    return (
        <section>
            <h1>Aircraft</h1>
            <ul>
            { state.aircraft.map(aircraft =>
                <li><a onclick={ _ => actions.chooseAircraft(aircraft.name) }>{ aircraft.name }</a></li>
            )}
            </ul>
        </section>
    )
}
const CloseButton = ({ actions }) => (<a class='closeButton' onclick={ _ => actions.chooseAircraft() }>&#x2715;</a>)

const Main = ({ state, actions }) => {
    if (state.selectedAircraft != null) {
        return (
            <main>
                <CloseButton actions={ actions } />
                <h1>{ state.selectedAircraft.name }</h1>
                <object type="image/svg+xml" id="svg" data={ `aircraft/${state.selectedAircraft.image}` }/>

                { state.selectedAircraft.procedures.map(procedure => (
                    <List className='procedure' list={ procedure } />
                ))}

                { state.selectedAircraft.systems.map((system, index) => (
                    <Transition delay={ index * 0.15 } reverses>
                        <List list={ system } />
                    </Transition>
                ))}
            </main>
        )
    } else {
        return (
            <main>
                <Selection state={ state } actions={ actions }/>
            </main>
        )
    }
}

const List = ({ className, list }) => (
    <section class={ className }>
        <h1>{ list.name }</h1>
        <dl>
            { list.items.map(item =>
                Object.keys(item).map(key =>
                    ListItem(item, key)
                )
            )}
        </dl>
    </section>
)

const ListItem = (item, name) => ([<dt>{ name }</dt>, <dd>{ item[name] }</dd>])

const Transition = (props, children) => {
    const reverses = Object.keys(props || {}).filter(k => k == 'reverses').length != 0
    const duration = `duration` in (props || {}) ? props.duration : 0.15
    const delay = `delay` in (props || {}) ? props.delay : 0

    const animatedChildren = children.map(child => {
        child.data.style = {
            transitionDuration: `${duration}s`,
            transitionDelay: `${delay}s`
        }

        child.data.oncreate = element => {
            element.className = 'transition-start'
        }

        child.data.oninsert = element => {
            element.className = 'transition-end'
        }

        if (reverses) {
            function handleTransitionEnd(event) {
                if (event.target.parentNode) {
                    event.target.parentNode.removeChild(event.target)
                }
                event.target.removeEventListener('transitionend', handleTransitionEnd, false)
            }

            child.data.onremove = element => {
                element.className = 'transition-start'
                element.addEventListener('transitionend', handleTransitionEnd, false)
            }
        }
        return child
    })

    return animatedChildren
}

app({
    state: {
        aircraft: [],
        selectedAircraft: null,
    },

    view: (state, actions) => {
        return (
            <Main state={ state } actions={ actions } electedAircraft={ state.selectedAircraft }/>
        )
    },

    actions: {
        loadIndex: (state, actions) => {
            fetch('/aircraft/index.json')
            .then(response => response.json())
            .then(json =>
                json.map(path =>
                    fetch(`/aircraft/${path}`)
                    .then(response => response.json())
                    .then(json => actions.updateAircraft(json))
                )
            )
        },

        updateAircraft: (state, actions, json) => {
            state.aircraft.push(json)
            state.aircraft.sort()
            return { aircraft : state.aircraft }
        },

        chooseAircraft: (state, actions, choice) => {
            const aircraft = choice !== undefined ? state.aircraft.filter( value => value.name == choice )[0] : null
            return { selectedAircraft: aircraft }
        }
    },

    events: {
        loaded: (state, actions) => {
            actions.loadIndex()
        }
    }
})