'use strict'

const Reflux = require('reflux-core')
require('./').install(Reflux)

const Actions = Reflux.createActions([
  'cityUpdate',
  'countryUpdate'
])

const FlightPriceStore = Reflux.createStore({
  listenables: Actions,
  init () {
    this.price = null
  },
  onCityUpdate () {
    this._recalculatePrice()
  },
  onCountryUpdate () {
    this._recalculatePrice()
  },
  _recalculatePrice () {
    // _________________________________________________
    //                                                \\\
    //   Try commenting out these two lines below      \\\
    /*   by removing this asterisk: -----------------> /*/
    // _______________________________________________///
    Reflux.waitFor(CountryStore)
    Reflux.waitFor(CityStore)
    // */
    this.price = 'Price for ' + CountryStore.countryId + '/' + CityStore.cityId
    this.trigger()
  }
})

const CountryStore = Reflux.createStore({
  listenables: Actions,
  init () {
    this.countryId = null
  },
  onCountryUpdate (country) {
    this.countryId = country.toUpperCase()
    this.trigger()
  }
})

const CAPITALS = {
  THAILAND: 'BANGKOK'
}

const CityStore = Reflux.createStore({
  listenables: Actions,
  init () {
    this.cityId = null
  },
  onCityUpdate (city) {
    this.cityId = city.toUpperCase()
    this.trigger()
  },
  onCountryUpdate () {
    Reflux.waitFor(CountryStore)
    this.cityId = CAPITALS[CountryStore.countryId].toUpperCase()
    this.trigger()
  }
})

FlightPriceStore.listen(() => {
  console.log('FlightPriceStore trigger:\n\n    ' + FlightPriceStore.price + '\n')
})

Actions.countryUpdate.trigger('thailand')
