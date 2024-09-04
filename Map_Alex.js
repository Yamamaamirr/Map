mapboxgl.accessToken = 'pk.eyJ1IjoiYW50ZWxvdmUxOSIsImEiOiJja2d1azl4ZmgwY3dvMnJueGljMnp6YnprIn0.aIRE0Ii2AmWYWCW5Z3cEFg';
const part1 = 'AIzaSyDgUIRS';
const part2 = 'sQD2F2Hy3KOHkU';
const part3 = 'CYoBoRUenptF0';
const concatenation = part1 + part2 + part3;

const script = document.createElement('script');
script.src = `https://maps.googleapis.com/maps/api/js?key=${concatenation}&libraries=places`;
document.head.appendChild(script);

var marker; 
var markers = []; 
var bufferLayer;

let globalResults = {}; 

const slider = document.getElementById('rating');
const display = document.getElementById('rating-display');

function toggleFilters() {
    var container = document.getElementById('container');
    var filters = document.getElementById('filters');
    var updateRadiusButton = document.getElementById('updateRadiusButton');
    
    if (filters.classList.contains('hidden')) {
        filters.classList.remove('hidden');
        container.classList.remove('collapsed');
        container.classList.add('expanded');
        document.getElementById('toggleButton').innerText = 'Hide Filters';
        updateRadiusButton.classList.remove('hidden');
    } else {
        filters.classList.add('hidden');
        container.classList.remove('expanded');
        container.classList.add('collapsed');
        document.getElementById('toggleButton').innerText = 'Show Filters';
        updateRadiusButton.classList.add('hidden');
    }
}

function updateRadius() {
    const latitude = parseFloat(document.getElementById('latitude').value);
    const longitude = parseFloat(document.getElementById('longitude').value);
    const buffer = parseFloat(document.getElementById("radiusSlider").value);
    console.log("buffer " + buffer);
    
    if (!isNaN(latitude) && !isNaN(longitude)) {
    console.log('Form submitted with:', { latitude, longitude });
    
    initMap(latitude, longitude);
    
    drawBuffer([longitude, latitude],buffer);
    } else {
    console.error('Invalid latitude or longitude values');
    }
}
const markerSVGs = {
'restaurant': 'svgs/fork.svg',
'cafe': 'svgs/cafe.svg',
'grocery_or_supermarket': 'svgs/cart.svg',
'tourist_attraction': 'svgs/tree.svg'
};


var map = new mapboxgl.Map({
container: 'map',
zoom: 0.8, 
center: [0, 60], 
pitch: 30, 
bearing: -30, 
style: 'mapbox://styles/mapbox/streets-v11',
projection: 'globe' 
}); 

map.on('style.load', () => { map.setLayoutProperty('poi-label', 'visibility', 'none');
map.setFog({
color: 'rgb(186, 210, 235)',
'high-color': 'rgb(36, 92, 223)', 
'horizon-blend': 0.02, 
'space-color': 'rgb(11, 11, 25)', 
'star-intensity': 0.6 
});


const layers = map.getStyle().layers;
const labelLayerId = layers.find(
(layer) => layer.type === 'symbol' && layer.layout['text-field']
).id;

map.addLayer(
{
    'id': 'add-3d-buildings',
    'source': 'composite',
    'source-layer': 'building',
    'filter': ['==', 'extrude', 'true'],
    'type': 'fill-extrusion',
    'minzoom': 15,
    'paint': {
        'fill-extrusion-color': '#aaa',

        // Smooth transition for building height
        'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'height']
        ],
        'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'min_height']
        ],
        'fill-extrusion-opacity': 0.6
    }
},
labelLayerId
);
});


function removeMarkers() {
    markers.forEach(m => m.remove()); 
    markers = []; 
   
}


 function removeBuffer() {
    if (bufferLayer) {
        map.removeLayer('buffer-layer'); 
        map.removeSource('buffer'); 
        bufferLayer = null;
    }
}
document.getElementById('markerButton').addEventListener('click', () => {
    if (initialGeoLocation) {
        // Reset to the initial geolocation if it was chosen
        reverseGeocode(initialGeoLocation.longitude, initialGeoLocation.latitude)
            .then(address => {
                handleLocationChange(map, initialGeoLocation.longitude, initialGeoLocation.latitude, address);
            })
            .catch(error => {
                console.error('Error getting address:', error);
                handleLocationChange(map, initialGeoLocation.longitude, initialGeoLocation.latitude, 'Unknown location');
            });
    } else if (searchLocationHistory.length > 1) {
        // Reset to the last search location before the current one
        const previousLocation = searchLocationHistory[searchLocationHistory.length - 2];
        handleLocationChange(map, previousLocation.longitude, previousLocation.latitude, previousLocation.address);

        // Remove the last location since we're "going back"
        searchLocationHistory.pop();
    } else {
        console.log('No previous location to reset to.');
    }
});
document.getElementById('searchNowButton').addEventListener('click', function() {
const latitude = parseFloat(document.getElementById('latitude').value);
const longitude = parseFloat(document.getElementById('longitude').value);
const buffer = parseFloat(document.getElementById("radiusSlider").value);
console.log("buffer " + buffer);

if (!isNaN(latitude) && !isNaN(longitude)) {
console.log('Form submitted with:', { latitude, longitude });

initMap(latitude, longitude);

drawBuffer([longitude, latitude],buffer);
} else {
console.error('Invalid latitude or longitude values');
}
});


async function initMap(lat, lng) {
document.getElementById('loader').classList.remove('hidden');

const location = { lat: lat, lng: lng };
map.setCenter([lng, lat]);

if (marker) {
marker.remove();
}

marker = new mapboxgl.Marker({ draggable: true })
.setLngLat([lng, lat])
.addTo(map);

marker.on('dragend', function(event) {
const lngLat = event.target.getLngLat();
const formattedLng = lngLat.lng.toFixed(3);
const formattedLat = lngLat.lat.toFixed(3);
document.getElementById('longitude').value = formattedLng;
document.getElementById('latitude').value = formattedLat;
});

let userradius = parseFloat(document.getElementById("radiusSlider").value);
if (userradius > 0 && userradius <= 10){ 
userradius = userradius * 1000;
}

console.log("userradius is " + userradius);
globalResults = {}; 
removeBuffer();
removeMarkers();
resetFilters();

console.log("call sent");

const service = new google.maps.places.PlacesService(document.createElement('div'));
const placeTypes = ['restaurant', 'cafe', 'grocery_or_supermarket', 'tourist_attraction'];

async function searchPlaces(type) {
return new Promise((resolve, reject) => {
    const request = {
        location: location,
        radius: userradius,
        type: [type]
    };

    function processResults(results, pagination) {
        globalResults[type] = (globalResults[type] || []).concat(results);
        console.log(`Results for ${type}:`, globalResults[type]);

        results.forEach((place) => {
            const svg = markerSVGs[type] || 'coffee.svg';
            const placeMarker = new mapboxgl.Marker({
                element: createSVGMarker(svg)
            }).setLngLat([place.geometry.location.lng(), place.geometry.location.lat()])
              .addTo(map);

            placeMarker.getElement().addEventListener('click', () => {
                const modalContent = createPopupContent(place);
                showModal(modalContent);
            });

            markers.push(placeMarker);
        });

        if (pagination && pagination.hasNextPage) {
            pagination.nextPage();
        } else {
            resolve(globalResults[type]);
        }
    }

    service.nearbySearch(request, (results, status, pagination) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            processResults(results, pagination);
        } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            console.warn(`No results found for ${type}.`);
            resolve([]);
        } else {
            console.error(`Places service request failed for ${type}:`, status);
            reject(status);
        }
    });
});
}

try {
await Promise.all(placeTypes.map(type => searchPlaces(type)));
console.log('Final globalResults:', globalResults);
} catch (error) {
console.error('Error during place search:', error);
} finally {
document.getElementById('loader').classList.add('hidden');
}
}

function createSVGMarker(svgUrl) {
const container = document.createElement('div');
container.innerHTML = `<img src="${svgUrl}" style="width: 28px; height: 28px;" />`;
return container;
}


function drawBuffer(lngLat,bufferradius) {
    const Radius = bufferradius; 
const buffer = turf.circle(lngLat, Radius, {
steps: 64,
units: 'kilometers'
});

    if (map.getSource('buffer')) {
        map.getSource('buffer').setData(buffer);
    } else {
        map.addSource('buffer', {
            type: 'geojson',
            data: buffer
        });

        bufferLayer = map.addLayer({
            id: 'buffer-layer',
            type: 'fill',
            source: 'buffer',
            paint: {
                'fill-color': '#007cbf',
                'fill-opacity': 0.2
            }
        });
    }
}


document.addEventListener('click', function(event) {
const suggestionsContainer = document.getElementById('suggestions');
const addressInput = document.getElementById('address');

if (!suggestionsContainer.contains(event.target) && event.target !== addressInput) {
suggestionsContainer.classList.add('hidden');
}
});

document.getElementById('address').addEventListener('focus', function() {
this.select();
}); 


document.getElementById('address').addEventListener('input', async function() {
    const input = this.value;
    const suggestionsContainer = document.getElementById('suggestions');
    
    if (input.length > 2) {
        const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(input)}.json?access_token=${mapboxgl.accessToken}&types=address`);
        const data = await response.json();
        const suggestions = data.features;

        suggestionsContainer.innerHTML = suggestions.map(suggestion => 
`<li data-long="${suggestion.center[0]}" data-lat="${suggestion.center[1]}" class="suggestion-item p-2 cursor-pointer hover:bg-gray-200">
${suggestion.place_name}
</li>`
).join('');
        suggestionsContainer.classList.remove('hidden');
    } else {
        suggestionsContainer.classList.add('hidden');
    }
});

let initialGeoLocation = null;
let searchLocationHistory = [];

// Function to handle location change and store location
function handleLocationChange(map, longitude, latitude, address) {
    document.getElementById('longitude').value = longitude;
    document.getElementById('latitude').value = latitude;
    document.getElementById('address').value = address;

    // Add the current location and address to the history array
    searchLocationHistory.push({ longitude, latitude, address });

    // Reset global state and remove existing markers
    globalResults = {};
    resetFilters();
    removeMarkers();

    // Create and add new marker
    if (marker) {
        marker.remove();
    }

    marker = new mapboxgl.Marker({ draggable: true })
        .setLngLat([longitude, latitude])
        .addTo(map);

    map.flyTo({
        center: [longitude, latitude],
        zoom: 14,   // Adjust zoom level as needed
        speed: 4,   // Default is 1.5, increase to speed up the flight
        curve: 1,   // Default is 1.42, decrease for a sharper curve
    });

    // Set initial radius and draw buffer
    const initialRadius = 2;
    document.getElementById('radiusSlider').value = initialRadius;
    document.getElementById('radiusValue').textContent = `${initialRadius} km`;
    drawBuffer([longitude, latitude], initialRadius);

    // Add dragend event to update coordinates on drag
    marker.on('dragend', function (event) {
        const lngLat = event.target.getLngLat();
        const formattedLng = lngLat.lng.toFixed(3);
        const formattedLat = lngLat.lat.toFixed(3);

    });
}

// Function to reverse geocode using Mapbox API
function reverseGeocode(longitude, latitude) {
    return fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxgl.accessToken}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.features && data.features.length > 0) {
                return data.features[0].place_name; // Get the first result's place name
            } else {
                throw new Error('No address found for the provided coordinates.');
            }
        })
        .catch(error => {
            console.error('Error with reverse geocoding:', error);
            return 'Unknown location';
        });
}


// Handle geolocation confirmation and storage
confirmLocation.addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                initialGeoLocation = { longitude, latitude };  // Store initial geolocation

                // Reverse geocode to get the address
                reverseGeocode(longitude, latitude)
                    .then(address => {
                        handleLocationChange(map, longitude, latitude, address);
                    })
                    .catch(error => {
                        console.error('Error getting address:', error);
                        handleLocationChange(map, longitude, latitude, 'Unknown location');
                    });
            },
            (error) => {
                console.error('Error getting location:', error);
                alert('Unable to retrieve your location.');
            }
        );
    } else {
        alert('Geolocation is not supported by your browser.');
    }
    locationModal.classList.add('hidden');
});

// Event listener for search suggestions
document.getElementById('suggestions').addEventListener('click', function(e) {
    if (e.target && e.target.matches('.suggestion-item')) {
        const longitude = e.target.getAttribute('data-long');
        const latitude = e.target.getAttribute('data-lat');
        const address = e.target.textContent;

        handleLocationChange(map, longitude, latitude, address);
        this.classList.add('hidden');
    }
});
     let activeFilters = [];



function createPopupContent1(place) {
const imageUrl = 'https://lh5.googleusercontent.com/p/AF1QipNXZWxqACUSI6R43tAJ0KBYtaZjhZ62B43q0oke=w750-h401-p-k-no';
const name = place.name || 'No name available';
const rating = place.rating ? `Rating: ${place.rating}` : 'No rating available';
const vicinity = place.vicinity || 'No vicinity available';

const vicinityText = `Located at ${vicinity}.`;

return `
<div>
    <strong>${name}</strong>
    <p>${rating} ⭐</p>
    <p>${vicinityText} 📍</p>
    <img src="${imageUrl}" alt="${place.name}" style="width: 100%; height: auto;"/>

</div>
`;
}

function showModal(content) {
const modal = document.getElementById('myModal');
const modalContent = document.getElementById('modalContent');
modalContent.innerHTML = content;
modal.style.display = 'block'; 
}
function createPopupContent(place) {
const name = place.name || 'No name available';
const rating = place.rating ? `Rating: ${place.rating}` : 'No rating available';
const vicinity = place.vicinity || 'No vicinity available';

let status = 'Status information not available';
if (place.opening_hours) {
status = place.opening_hours.isOpen() ? 'Currently open 🟢' : 'Currently closed 🔴';
}

const vicinityText = `Located at ${vicinity}.`;

const photos = place.photos ? 
place.photos.map(photo => `<img src="${photo.getUrl()}" style="width: 100%; height: auto; max-height: 300px; object-fit: cover;">`).join('') : 
'No photos available 📷';

return `
<div>
    <strong>${name}</strong>
    <p>${rating} ⭐</p>
    <p>${vicinityText} 📍</p>
    <p>Status: <span style="font-size: 0.9em;">${status}</span></p>
    <div>${photos}</div>
</div>
`;
}
function showModal(content) {
const modal = document.getElementById('info-modal');
const modalBody = document.getElementById('modal-body');
modalBody.innerHTML = content;
modal.style.display = 'block';
}

function hideModal() {
const modal = document.getElementById('info-modal');
modal.style.display = 'none';
}

document.querySelector('.close-button').addEventListener('click', hideModal);

window.addEventListener('click', (event) => {
if (event.target == document.getElementById('infoModal')) {
hideModal();
}
});

function resetFilters() {
activeFilters = [];

document.querySelectorAll('.filter-button').forEach(button => {
button.classList.remove('active');
});

filterMarkersByType();
}
document.querySelectorAll('.filter-button').forEach(button => {
button.addEventListener('click', function() {
const type = this.getAttribute('data-type');

if (activeFilters.includes(type)) {
    activeFilters = activeFilters.filter(filter => filter !== type);
    this.classList.remove('active');
} else {
    activeFilters.push(type);
    this.classList.add('active');
}

filterMarkersByType();
});
});

function filterMarkersByType() {
removeMarkers();
console.log("filter called");
const bounds = new mapboxgl.LngLatBounds();

const isTypeFilterActive = activeFilters.length > 0;
const isRatingFilterActive = selectedRating > 1;

if (!isTypeFilterActive && !isRatingFilterActive) {
Object.keys(globalResults).forEach(type => {
    globalResults[type].forEach(place => {
        const svg = markerSVGs[type] || 'coffee.svg'; 
        const marker = new mapboxgl.Marker({
            element: createSVGMarker(svg)
        }).setLngLat([place.geometry.location.lng(), place.geometry.location.lat()])
          .addTo(map);

        marker.getElement().addEventListener('click', () => {
            showModal(createPopupContent(place));
        });

        markers.push(marker);
     

        bounds.extend([place.geometry.location.lng(), place.geometry.location.lat()]);
    });
});
} else {
const typesToInclude = isTypeFilterActive ? activeFilters : Object.keys(globalResults);

typesToInclude.forEach(type => {
    if (globalResults[type]) {
        globalResults[type].forEach(place => {
            if (shouldIncludePlace(place)) {
                const svg = markerSVGs[type] || 'coffee.svg'; 
                const marker = new mapboxgl.Marker({
                    element: createSVGMarker(svg)
                }).setLngLat([place.geometry.location.lng(), place.geometry.location.lat()])
                  .addTo(map);

                marker.getElement().addEventListener('click', () => {
                    showModal(createPopupContent(place));
                });

                markers.push(marker);
              

                bounds.extend([place.geometry.location.lng(), place.geometry.location.lat()]);
            }
        });
    } else {
        console.error(`No places found for type: ${type}`);
    }
});
}

if (markers.length > 0) {
map.fitBounds(bounds, {
    padding: { top: 100, bottom: 100, left: 100, right: 100 },
    pitch: map.getPitch(),
    bearing: map.getBearing(),
    maxZoom: 15, 
    animate: true 
});
}
}

function shouldIncludePlace(place) {
const placeRating = place.rating || 0; 
return selectedRating === 5 ? placeRating === 5 : placeRating >= selectedRating;
}



let selectedRadius = parseFloat(document.getElementById('radiusSlider').value);
let selectedRating = parseFloat(document.getElementById('ratingSlider').value);

const radiusSlider = document.getElementById('radiusSlider');
const radiusValue = document.getElementById('radiusValue');


radiusSlider.addEventListener('input', function() {
const longitude=document.getElementById('longitude').value;
const latitude =document.getElementById('latitude').value;
selectedRadius = parseFloat(this.value);
radiusValue.textContent = `${this.value}km`;
removeBuffer();
drawBuffer([longitude,latitude],selectedRadius)

});

const ratingSlider = document.getElementById('ratingSlider');
const ratingValue = document.getElementById('ratingValue');

ratingSlider.addEventListener('input', function() {
selectedRating = parseFloat(this.value);
ratingValue.textContent = selectedRating === 5 ? selectedRating : `${selectedRating}+`;
filterMarkersByType(); 
});


window.addEventListener('load', () => {
    const locationModal = document.getElementById('locationModal');
    const confirmLocation = document.getElementById('confirmLocation');
    const cancelLocation = document.getElementById('cancelLocation');

    locationModal.classList.remove('hidden');

    confirmLocation.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    handleLocationChange(map, longitude, latitude);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    alert('Unable to retrieve your location.');
                }
            );
        } else {
            alert('Geolocation is not supported by your browser.');
        }
        locationModal.classList.add('hidden');
    });

    cancelLocation.addEventListener('click', () => {
        locationModal.classList.add('hidden');
    });
});
