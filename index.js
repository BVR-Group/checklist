import { h, app } from "hyperapp"

const Selection = ({ state, actions }) => {
    let name = ''
    if (state.selectedAircraft !== null) {
        name = state.selectedAircraft.name
    }
    return (
        <section>
            <select value={ name }
                    onchange={ event => {
                        actions.chooseAircraft(event.target.value)
                    }}
            >
                { state.aircraft.map(aircraft => <option value={ aircraft.name }>{ aircraft.name }</option>) }
            </select>
        </section>
    )
}

function Main({ state, actions }) {
    if (state.selectedAircraft != null) {
        return (
            <main>
                <object type="image/svg+xml" id="svg" data={ 'aircraft/' + state.selectedAircraft.image }/>
                <Selection state={ state } actions={ actions }/>
                { state.selectedAircraft.procedures.map(procedure => (
                    <List list={ procedure } />
                ))}
                { state.selectedAircraft.systems.map(system => (
                    <List list={ system } />
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

function List({ list }) {
    return (
        <section>
            <h1>{ list.name }</h1>
            <dl>
                { list.items.map(item =>
                    Object.keys(item).map(key =>
                        Item(item, key)
                    )
                )}
            </dl>
        </section>
    )
}

function Item(item, name) {
    return ([
        <dt>{ name }</dt>,
        <dd>{ item[name] }</dd>
    ])
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
            return { selectedAircraft: state.aircraft.filter( value => value.name == choice )[0] }
        }
    },

    events: {
        loaded: (state, actions) => {
            actions.loadIndex()
        }
    }
})