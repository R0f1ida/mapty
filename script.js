'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const  btnDeleteWorkouts = document.querySelector('.btn--delete');
const btnSort = document.querySelector('.btn--sort');
const message = document.querySelector('.message');
class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);
    constructor(coords, distance, duration, city, country){
        this.coords = coords;
        this.distance = distance;
        this.duration = duration;
        this.city = city;
        this.country = country;
        
    }
    
    _setDescription(){
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
        'July', 'August', 'September', 'October', 'November', 'December'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
    }
}

class Running extends Workout {
    type = "running";
    constructor(coords, distance, duration, city, country, cadence){
        super(coords, distance, duration, city, country)
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();

    }
    
    calcPace(){
        this.pace = this.duration / this.distance;
        return this.pace
    }
}

class Cycling extends Workout {
    type= "cycling";
    constructor(coords, distance, duration, city, country, elevationGain){
        super(coords, distance, duration, city, country)
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

class App {
    #map;
    #mapEvent;
    #mapzoom = 13;
    #workouts = [];
    constructor() {
        this._getPosition();
        this._getLocalStorage();
        this._hideDeleteButton();
        //handelers
        form.addEventListener("submit", this._newWorkout.bind(this));
        this._removeWorkout();
        inputType.addEventListener("change", this._toggleElevationField.bind(this));
        containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
        btnDeleteWorkouts.addEventListener("click", this._clearLocalStorage.bind(this));
        btnSort.addEventListener('click', this._sortWorkouts.bind(this));
        
       
    }

    _getPosition() {
        if(navigator.geolocation){
            navigator.geolocation.getCurrentPosition(
                this._loadMap.bind(this)
                ,function(){
                    const html = `
                        <div class="error">
                            <div>
                            <svg>
                                <use href="/img/icons.svg#icon-alert-triangle"></use>
                            </svg>
                            </div>
                            <p>Allow access location!</p>
                        </div> 
                    `
                    containerWorkouts.innerHTML = '';
                    containerWorkouts.insertAdjacentHTML("afterbegin",html);

                })
        }
    }

    _getLocation(workout) {
        fetch(`https://geocode.xyz/${workout.coords[0]},${workout.coords[1]}?geoit=json&auth=646165016186869981748x44081`)
        .then(res => {
            return res.json();
        }).then(data => {
            workout.country = data.country ? data.country : '';
            workout.city = data.region;
            console.log(workout);
            console.log(data);
        })
    }

    _loadMap(position) {
        const { latitude } = position.coords;
        const { longitude } = position.coords;
        const coords = [latitude, longitude]

        this.#map = L.map('map').setView(coords, this.#mapzoom);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        this.#map.on("click", this._showForm.bind(this))

        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work)
        })

    }



    _hideDeleteButton(){
        if(this.#workouts.length === 0){
            btnDeleteWorkouts.style.display='none';
            btnSort.style.display = 'none';
            message.style.display = 'flex';  
        }else {
            btnDeleteWorkouts.style.display="block";
            btnSort.style.display = 'block';
            message.style.display = 'none';
        } 
    }
    _showForm(mapEv) {
        this.#mapEvent = mapEv; 
        form.classList.remove("hidden");
        inputDistance.focus();       
        
    }

    _hideForm(){
        inputCadence.value = inputDistance.value = inputDuration.value = inputElevation.value = '';
        form.style.display === "none";
        form.classList.add("hidden");
        setTimeout(() => form.style.display="grid",1000)
    }

    _toggleElevationField() {
        inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
        inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    }

    _newWorkout(e) { 
        e.preventDefault() 
        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) => inputs.every(inp => inp > 0)
        //get data
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
    
        const {lat, lng} = this.#mapEvent.latlng;
        let workout;

        // running or cycling
        if(type === "running"){
            const cadence = +inputCadence.value;
            if (!validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)){
                return form.insertAdjacentHTML('afterend', '<span class="error-number">inputs must be positive numbers</span>');
                
            }
               
            workout = new Running([lat, lng], distance, duration);
            workout.cadence = cadence;
        }
        if(type === "cycling"){
            const elevation = +inputElevation.value;
            if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration))
            return form.insertAdjacentHTML('afterend', '<span class="error-number">inputs must be positive numbers</span>');
            workout = new Cycling([lat, lng], distance, duration);
            workout.elevationGain = elevation;
        }
        //new workout
        this.#workouts.push(workout);
        this._getLocation(workout);
        this._renderWorkoutMarker(workout);
        this._renderWorkout(workout);
        this._hideForm();
        this._setLocalStorage();
        this._removeWorkout();
        this._hideDeleteButton();
        console.log(workout)
    }

    _setLocalStorage(){
        localStorage.setItem("workouts", JSON.stringify(this.#workouts));
    }

    _getLocalStorage(){
        const data = JSON.parse(localStorage.getItem("workouts"));

        if(!data)return;

        this.#workouts = data;
        this.#workouts.forEach(work => {
            this._renderWorkout(work)
        })

    }
    _clearLocalStorage() {
        localStorage.clear('workouts');
        this.#workouts = [];
        location.reload();
    }
    _renderWorkoutMarker(workout){
        let layer = workout.type === 'running'? 
        L.circle(workout.coords,{color: 'green', radius: 500}).addTo(this.#map)
        : L.marker(workout.coords).addTo(this.#map);
        layer.bindPopup(
            L.popup({
                maxWidth: "250",
                minWidth:"100",
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`
            })
        )
        .setPopupContent(`${workout.type === "running"? '🏃‍♂️': '🚴‍♀️'} ${workout.description}`)
        .openPopup(); 
    }
    

    _renderWorkout(workout) {
        let html = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
                <button class="btn--close">&times;</button>
                <h2 class="workout__title">${workout.description} in ${workout.city}, ${workout.country}</h2>
                <div class="workout__details">
                    <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️': '🚴‍♀️'}</span>
                    <span class="workout__value">${workout.distance}</span>
                    <span class="workout__unit">km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⏱</span>
                    <span class="workout__value">${workout.duration}</span>
                    <span class="workout__unit">min</span>
                </div>
        `

        if (workout.type === "running") {
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.pace.toFixed(1)}</span>
                    <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🦶🏼</span>
                    <span class="workout__value">${workout.cadence}</span>
                    <span class="workout__unit">spm</span>
                </div>
            </li>   
            `
        }
        
        if (workout.type === "cycling") {
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.speed.toFixed(1)}</span>
                    <span class="workout__unit">km/h</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.elevationGain}</span>
                    <span class="workout__unit">m</span>
                </div>
            </li>   
            `
        }
        form.insertAdjacentHTML("afterend", html);

    }
    _removeWorkout() {
        const btnClose =  document.querySelector('.btn--close');
        if(!btnClose)return;
        btnClose.addEventListener('click', (e)=>{
            const workoutEl = e.target.closest('.workout');
            if(!workoutEl)return;
            const workout = this.#workouts.find(workout => workout.id === workoutEl.dataset.id);
            const index =  this.#workouts.indexOf(workout);
            workoutEl.style.opacity = 0;        
            workoutEl.remove();   
            this._renderWorkoutMarker(workout,false);
            this.#workouts.splice(index, 1)
            this._setLocalStorage();
            location.reload();
    
        })
        
    }
    
    _sortWorkouts(){
        const sortedWorkouts = this.#workouts.slice().sort((a,b) => a.distance - b.distance);
        containerWorkouts.querySelectorAll('.workout').forEach(workoutE => workoutE.remove())
        sortedWorkouts.forEach(workout => this._renderWorkout(workout));

        console.log(this.#workouts)
        console.log(sortedWorkouts);
    }

    _moveToPopup(e){
        const workoutEL = e.target.closest(".workout");
        console.log(workoutEL);

        if(!workoutEL) return;

        const workout = this.#workouts.find(work => work.id === workoutEL.dataset.id);
        if(!workout)return;
        this.#map.setView(workout.coords, this.#mapzoom, {
            animate: true,
            pan: {
                duration: 1,
            },
        });
    }

    reset(){
        localStorage.removeItem("workouts");
        location.reload();
    }
}

const app = new App();



//https://geocode.xyz/${lat},${long}?geoit=json&auth=646165016186869981748x44081