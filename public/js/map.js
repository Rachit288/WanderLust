maptilersdk.config.apiKey = mapToken;

const map = new maptilersdk.Map({
    container: 'map', // container's id or the HTML element to render the map
    style: "basic-v2",
    center: listing.geometry.coordinates, // starting position [lng, lat]
    zoom: 9, // starting zoom
});

const marker = new maplibregl.Marker({color: "red"})
    .setLngLat(listing.geometry.coordinates) // Marker position [lng, lat]
    .setPopup(
        new maplibregl.Popup({ offset: 25 }).setHTML(
            `<h4>${listing.title}</h4><p>Exact Location will be provided after booking</p>`
        )
    )
    .addTo(map);