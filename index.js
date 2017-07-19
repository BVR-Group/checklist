import { h, app } from "hyperapp"

function Main({ selectedAircraft }) {
    if(selectedAircraft == null) {
        return (
            <main>
                <span>Loading</span>
            </main>
        )
    }
    return (
        <main>
            <h1>{ selectedAircraft.name }</h1>
            <object type="image/svg+xml" id="svg" data={ 'aircraft/' + selectedAircraft.image }/>
            { selectedAircraft.procedures.map(procedure => (
                <List list={ procedure } />
            ))}
            { selectedAircraft.systems.map(system => (
                <List list={ system } />
            ))}
        </main>
    )
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
            <Main selectedAircraft={ state.selectedAircraft }/>
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
            return { aircraft : [json], selectedAircraft: json }
        }
    },

    events: {
        loaded: (state, actions) => {
            actions.loadIndex()
        }
    }
})