'use strict';

class Workout {
    date = new Date();
    id = this.date.getTime();
    constructor(latlng, distance, duration) {
        this.latlng = latlng;
        this.distance = distance;
        this.duration = duration;
    }
    _setDescription() {
        this.description = `${this.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${this._capitalizedWord(
            this.type
        )} on ${this.date.toLocaleString('default', { month: 'long', day: 'numeric' })}`;
    }
    _capitalizedWord(word) {
        const copyWord = word.toLowerCase();
        return `${copyWord[0].toUpperCase()}${copyWord.slice(1)}`;
    }
}

class Running extends Workout {
    type = 'running';
    constructor(latlng, distance, duration, cadence) {
        super(latlng, distance, duration);
        this.cadence = cadence;
        this._calcPace();
        this._setDescription();
    }
    _calcPace() {
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = 'cycling';
    constructor(latlng, distance, duration, elevation) {
        super(latlng, distance, duration);
        this.elevation = elevation;
        this._calcSpeed();
        this._setDescription();
    }
    _calcSpeed() {
        // km/h
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

const form = document.querySelector('.form');
const warningDiv = document.querySelector('#warning');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const elWarningBox = document.querySelector('#warning-box');
const elWarning = document.querySelector('#warning');
const warningMsg = document.querySelector('#warning--msg');
const warningTitle = document.querySelector('#warning--title');
const warningClose = document.querySelector('#warning--close');

const menuControl = document.querySelector('#menu-control');
const workoutsList = document.querySelector('.workouts');

class App {
    #map;
    #zoom = 13;
    #workouts = [];
    #markers = new Map();
    #clickOnMapEvent;
    #sorted = false;
    constructor() {
        this._getLocalStorage();

        this._getCurrentPosition.call(this);
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleCadenceElevation.bind(this));
        form.closest('.workouts').addEventListener('click', this._moveToPopup.bind(this));
        warningClose.addEventListener('click', this._hideWarning);
        menuControl.addEventListener('click', this._menuControl.bind(this));
        workoutsList.addEventListener('click', this._workoutModify.bind(this));
    }

    _getCurrentPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => {
                    this.latlng = [pos.coords.latitude, pos.coords.longitude];
                    this._displayMap.call(this);
                },
                () => {
                    this._displayWarning(
                        `Unable to retrieve your current position.`,
                        `Kindly grant us permission to access your present location through your browser's settings.`
                    );
                }
            );
        }
    }

    _displayMap() {
        this.#map = L.map('map').setView(this.latlng, this.#zoom);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(this.#map);
        this.#map.on('click', this._displayForm.bind(this));

        this.#workouts.forEach(workout => {
            this._displayMarker(workout);
        });
    }

    _displayForm(e) {
        this._clearAllInputs();
        this._removeEditForm();
        form.classList.remove('hidden');
        inputDistance.focus();
        this.#clickOnMapEvent = e.latlng;
    }

    _hideForm() {
        this._clearAllInputs();
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(function () {
            form.style.display = 'grid';
        }, 300);
    }
    _areValidInputs(...inputs) {
        return inputs.every(input => Number.isFinite(input) && input > 0);
    }

    _newWorkout(e) {
        e.preventDefault();
        const typeWorkout = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#clickOnMapEvent;

        let workout;
        if (typeWorkout === 'running') {
            const cadence = +inputCadence.value;
            if (!this._areValidInputs(distance, duration, cadence)) {
                this._displayWarning(
                    'Invalid data',
                    'The values in the inputs should be only positive numbers'
                );
                return;
            }
            workout = new Running([lat, lng], distance, duration, cadence);
        }

        if (typeWorkout === 'cycling') {
            const elevation = +inputElevation.value;
            if (!this._areValidInputs(distance, duration, elevation)) {
                this._displayWarning(
                    'Invalid data',
                    'The values in the inputs should be only positive numbers'
                );
                return;
            }
            workout = new Cycling([lat, lng], distance, duration, elevation);
        }

        this._hideForm();
        this.#workouts.push(workout);
        this._displayMarker.call(this, workout);
        this._renderWorkout.call(this, workout);
        this._setLocalStorage.call(this);
        this._hideWarning();
    }

    _clearAllInputs() {
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
    }

    _toggleCadenceElevation(e) {
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _displayMarker(workout) {
        this.#markers.set(
            workout.id,
            L.marker(workout.latlng)
                .addTo(this.#map)
                .bindPopup(
                    L.popup({
                        maxWidth: 250,
                        minWidth: 100,
                        autoClose: false,
                        closeOnClick: false,
                        className: `${workout.type}-popup`,
                    })
                )
                .setPopupContent(workout.description)
                .openPopup()
        );
    }

    _renderWorkout(workout) {
        let html = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
                <h2 class="workout__title">
                    <span>${workout.description}</span>

                    <!-- button: edit workout -->
                    <button type="button" class="btn btn-outline-light btn-workout--edit" data-editing='false'>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pen" viewBox="0 0 16 16">
                            <path d="m13.498.795.149-.149a1.207 1.207 0 1 1 1.707 1.708l-.149.148a1.5 1.5 0 0 1-.059 2.059L4.854 14.854a.5.5 0 0 1-.233.131l-4 1a.5.5 0 0 1-.606-.606l1-4a.5.5 0 0 1 .131-.232l9.642-9.642a.5.5 0 0 0-.642.056L6.854 4.854a.5.5 0 1 1-.708-.708L9.44.854A1.5 1.5 0 0 1 11.5.796a1.5 1.5 0 0 1 1.998-.001zm-.644.766a.5.5 0 0 0-.707 0L1.95 11.756l-.764 3.057 3.057-.764L14.44 3.854a.5.5 0 0 0 0-.708l-1.585-1.585z"/>
                        </svg>
                    </button>

                    <!-- button: delete workout -->
                    <button type="button" class="btn btn-outline-light btn-workout--delete">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6Z"/>
                            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1ZM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118ZM2.5 3h11V2h-11v1Z"/>
                        </svg>
                    </button>
                </h2>
                <div class="workout__details">
                    <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
                    <span class="workout__value">${workout.distance}</span>
                    <span class="workout__unit">km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⏱</span>
                    <span class="workout__value">${workout.duration}</span>
                    <span class="workout__unit">min</span>
                </div>
        `;

        if (workout.type === 'running') {
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
                `;
        }

        if (workout.type === 'cycling') {
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.speed.toFixed(1)}</span>
                    <span class="workout__unit">km/h</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.elevation}</span>
                    <span class="workout__unit">m</span>
                </div>
            `;
        }

        html += `
            </li>
        `;

        form.insertAdjacentHTML('afterend', html);
    }

    _updateListWorkouts() {
        this.#workouts.forEach(workout => this._renderWorkout(workout));
    }

    _moveToPopup(e) {
        if (!this.#map) return;

        const workoutEl = e.target.closest('.workout');

        if (!workoutEl) return;

        const workout = this.#workouts.find(work => work.id === Number(workoutEl.dataset.id));

        this.#map.setView(workout.latlng, this.#zoom, {
            animate: true,
            pan: {
                duration: 1,
            },
        });
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const workoutsDonwloaded = JSON.parse(localStorage.getItem('workouts'));

        if (!workoutsDonwloaded) return;

        workoutsDonwloaded.forEach(workout => {
            this.#workouts.push(workout);
            this._renderWorkout(workout);
        });
    }

    _displayWarning(title, msg, btn = false) {
        elWarning.lastElementChild.style.display = 'none';
        elWarningBox.classList.remove('hidden');
        warningTitle.textContent = title;
        warningMsg.textContent = msg;
        elWarning.lastElementChild.textContent = title;
        if (btn) elWarning.lastElementChild.style.display = 'block';
    }

    _hideWarning() {
        elWarningBox.classList.add('hidden');
    }
    _menuControl(e) {
        if (e.target.id === 'delete--workouts') this._deleteAllWorkouts.call(this);
        else if (e.target.id === 'sort--workouts') this._sortAllWorkouts.call(this, e);
    }
    _clearWorkouts() {
        workoutsList.querySelectorAll('.workout').forEach(workout => {
            workout.remove();
        });
    }
    _deleteAllWorkouts() {
        this._displayWarning(
            'Delete all the workouts',
            'Are you sure you want to delete all the workouts?',
            true
        );
        elWarning.lastElementChild.addEventListener('click', function () {
            localStorage.clear();
            location.reload();
            elWarning.lastElementChild.removeEventListener('click');
        });
    }
    _sortAllWorkouts(e) {
        const copyWorkouts = this.#sorted ? this.#workouts : [...this.#workouts].reverse();
        this._clearWorkouts();
        copyWorkouts.forEach(workout => {
            this._renderWorkout(workout);
        });
        this.#sorted ? (this.#sorted = false) : (this.#sorted = true);
    }
    _findWorkout(el, htmlClass) {
        return this.#workouts.find(
            workout => workout.id === Number(el.closest(`.${htmlClass}`).dataset.id)
        );
    }
    _workoutModify(e) {
        const btnModify = e.target.closest('.btn');
        if (!btnModify) return;
        if (btnModify.classList.contains('btn-workout--delete'))
            this._workoutDelete.call(this, btnModify);
        else if (btnModify.classList.contains('btn-workout--edit'))
            if (btnModify.dataset.editing === 'true') {
                btnModify.dataset.editing = 'false';
                this._hideForm();
                this._removeEditForm();
            } else {
                this._workoutEdit.call(this, btnModify);
            }
    }
    _workoutDelete(btn) {
        const foundWorkout = this._findWorkout.call(this, btn, 'workout');
        this.#map.removeLayer(this.#markers.get(foundWorkout.id));
        this.#workouts.splice(this.#workouts.indexOf(foundWorkout), 1);
        this._clearWorkouts();
        this._setLocalStorage();
        this._updateListWorkouts.call(this);
    }
    _generateEditForm(workoutEl, workoutObj) {
        let html = `
        <form class="form-edit" data-id="${workoutEl.closest('.workout').dataset.id}">
            <div class="form__row">
                <label class="form__label">Type</label>
                <select class="form__input form-edit__input--type">${
                    workoutObj.type === 'running'
                        ? '<option value="running">Running</option><option value="cycling">Cycling</option>'
                        : '<option value="cycling">Cycling</option><option value="running">Running</option>'
                }
                </select>
            </div>
            <div class="form__row">
                <label class="form__label">Distance</label>
                <input class="form__input form-edit__input--distance" placeholder="km" value="${
                    workoutObj.distance
                }" />
            </div>
            <div class="form__row">
                <label class="form__label">Duration</label>
                <input class="form__input form-edit__input--duration" placeholder="min" value="${
                    workoutObj.duration
                }"/>
            </div>
            <div class="form__row ${workoutObj.type === 'running' ? '' : 'form__row--hidden'}">
                <label class="form__label">Cadence</label>
                <input
                    class="form__input form-edit__input--cadence"
                    placeholder="step/min" value="${
                        workoutObj.type === 'running' ? workoutObj.cadence : ''
                    }"
                />
            </div>
            <div class="form__row ${workoutObj.type === 'cycling' ? '' : 'form__row--hidden'}">
                <label class="form__label">Elev Gain</label>
                <input
                    class="form__input form-edit__input--elevation"
                    placeholder="meters" value="${
                        workoutObj.type === 'cycling' ? workoutObj.elevation : ''
                    }"
                />
            </div>
            <div class="form__row">
                <button type="submit" class="edit-confirm">Confirm</button>
            </div>
            <div class="form__row">
                <button class="edit-cancel">Cancel</button>
            </div>
        </form>
        `;

        workoutEl.insertAdjacentHTML('beforeend', html);
        return workoutEl.lastElementChild;
    }
    _removeEditForm() {
        const editForm = document.querySelector('.form-edit');
        if (editForm) {
            editForm.remove();
        }
    }
    _workoutEdit(btn) {
        const errorTitle = 'Invalid data';
        const errorMsg = 'The values in the inputs should be only positive numbers';

        const workoutEl = btn.closest('.workout');
        const workoutObj = this._findWorkout.call(this, btn, 'workout');
        this._removeEditForm();

        if (btn.dataset.editing === 'false') {
            const currentEditForm = this._generateEditForm(workoutEl, workoutObj);
            const inputEditType = currentEditForm.querySelector('.form-edit__input--type');
            const inputEditDistance = currentEditForm.querySelector('.form-edit__input--distance');
            const inputEditDuration = currentEditForm.querySelector('.form-edit__input--duration');
            const inputEditCadence = currentEditForm.querySelector('.form-edit__input--cadence');
            const inputEditElevation = currentEditForm.querySelector(
                '.form-edit__input--elevation'
            );

            currentEditForm
                .querySelector('.edit-cancel')
                .addEventListener('click', this._removeEditForm);
            this._hideForm();

            inputEditType.addEventListener('change', function (e) {
                inputEditCadence.closest('.form__row').classList.toggle('form__row--hidden');
                inputEditElevation.closest('.form__row').classList.toggle('form__row--hidden');
            });

            currentEditForm.addEventListener('submit', e => {
                e.preventDefault();
                const duration = Number(inputEditDuration.value);
                const distance = Number(inputEditDistance.value);
                const workoutType = inputEditType.value;
                if (workoutType === 'running') {
                    const cadence = Number(inputEditCadence.value);
                    if (!this._areValidInputs(cadence, duration, distance)) {
                        this._displayWarning(errorTitle, errorMsg);
                        return;
                    }
                    delete workoutObj.elevation;
                    delete workoutObj.speed;
                    workoutObj.pace = duration / distance;
                    workoutObj.cadence = cadence;
                    workoutObj.description =
                        '🏃‍♂️ ' +
                        (workoutType[0].toUpperCase() + workoutType.slice(1).toLowerCase()) +
                        ' on ' +
                        workoutObj.description.split(' on ')[1];
                } else {
                    const elevation = Number(inputEditElevation.value);
                    if (!this._areValidInputs(elevation, duration, distance)) {
                        this._displayWarning(errorTitle, errorMsg);
                        return;
                    }
                    delete workoutObj.cadence;
                    delete workoutObj.pace;
                    workoutObj.speed = distance / duration;
                    workoutObj.elevation = elevation;
                    workoutObj.description =
                        '🚴‍♀️ ' +
                        (workoutType[0].toUpperCase() + workoutType.slice(1).toLowerCase()) +
                        ' on ' +
                        workoutObj.description.split(' on ')[1];
                }

                workoutObj.type = workoutType;
                workoutObj.distance = distance;
                console.log();
                workoutObj.duration = duration;
                this._removeEditForm();
                this._setLocalStorage();
                this._clearWorkouts();
                this._updateListWorkouts.call(this);
            });
        } else {
            this._removeEditForm();
        }
    }
}

const app = new App();
