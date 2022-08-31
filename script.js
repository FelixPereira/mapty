'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

let map, mapEvent;

// Application architecture start
class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];

  constructor() {
    this._getPosition();
    this._getLocalstorage();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));

    console.log(this.#workouts);
  }

  _getPosition() {
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function() {
          alert('Could not get your position');
      });
    };
  }

  _loadMap(position) {
    const {latitude} = position.coords;
    const {longitude} = position.coords;

    const coords = [latitude, longitude]
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
 
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.#map);

    L.marker(coords).addTo(this.#map)
        .bindPopup('A pretty CSS3 popup.<br> Easily customizable.')
        .openPopup();
    
    // Handling click on map
    this.#map.on('click', this._showForm.bind(this));

    // Display workouts markrs on map
    this.#workouts.forEach(workout => {
      this._renderWorkoutMarker(workout);
    })
    
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value = inputDuration.value = inputElevation.value = inputCadence.value = '';

    // Hide form 
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => form.style.display = 'grid', 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    // Check if data is valid
    const validateInputs = (...inputs) => inputs.every(input => !isFinite(input) || input <= 0);

    // Get data from form
    const workoutType = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;  
    const {lat, lng} = this.#mapEvent.latlng;
    const destinationCoords = [lat, lng]; 
    let workout;

    // If activity running, create running object
    if(workoutType === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if(validateInputs(distance, duration, cadence)) return alert('Inputs must be positive numbers');
      
      // Add new object to workout array
      workout = new Running(destinationCoords, distance, duration, cadence);
      this.#workouts.push(workout);
    }
      
    // If activity cycling, create cycling object
    if(workoutType === 'cycling') {
      const elevation = +inputElevation.value;
      // Check if data is valid
      if(validateInputs(distance, duration, elevation)) return alert('Inputs must be positive numbers');
            
      // Add new object to workout array
      workout = new Cycling(destinationCoords, distance, duration, elevation);
      this.#workouts.push(workout);
    }

    // Render workout on map as marker  
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form and clear inputs
    this._hideForm();

    // Set localstorage to all workouts
    this._setLocalstorage();
  }

  // Render workout on map as marker  
  _renderWorkoutMarker = (workout) => {
    L.marker(workout.coords)
    .addTo(this.#map)
    .bindPopup(
      L.popup({
        maxWidth: 250, 
        minWidth: 100,
        autoClose: false,
        closeOnClick: false,
        className: `${workout.workoutType}-popup`,
      })
    )
    .setPopupContent(`
      ${workout.workoutType === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
    )
    .openPopup();
  }

  _renderWorkout(workout) {
    const html = `
      <li class="workout workout--${workout.workoutType}" data-id="${workout.id}">
        
        <div class="workout__header">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="header__icons">
            <span class="icon__delete">X</span>
            <span class="icon__delete">X</span>
          </div>
        </div>
        
        <div class="workout__body">
          <div class="workout__details">
            <span class="workout__icon">${workout.workoutType === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>

          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.workoutType === 'running' ? workout.pace : workout.speed} </span>
            <span class="workout__unit">${workout.workoutType === 'running' ? 'min/km' : 'km/h'}</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">${workout.workoutType === 'running' ? '🦶🏼' : '⛰'}</span>
            <span class="workout__value">${workout.workoutType === 'running' ? workout.cadence : workout.elevationGain}</span>
            <span class="workout__unit">${workout.workoutType === 'running' ? 'spm' : 'm'}</span>
          </div>
        </div>
      </li>
    `;
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if(!workoutEl) return;

    const workout = this.#workouts.find(workout => workout.id === workoutEl.dataset.id);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1
      }
    });

    workout.click();
  }

  _setLocalstorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  } 

  _getLocalstorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if(!data) return;

    this.#workouts = data;
    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
    })
  }

  _deleteWorkout(event) {
    const workoutEl = event.target.closest('.workout');

    if(!event.target.classList.contains('icon__delete')) return;

    const work = this.#workouts.find(workout => workout.id = workoutEl.dataset.id)

    this.#workouts.pop(work);
    this._setLocalstorage();
    location.reload();

    console.log(this.#workouts);
  }
}

// Application architecture end
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.workoutType[0].toUpperCase()}${this.workoutType.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    return this.description;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  workoutType = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = (this.duration / this.distance).toFixed(1);
    return this.pace;
  }
}

class Cycling extends Workout {
  workoutType = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const app = new App();
