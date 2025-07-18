export function getExtent(paramsSearch) {
    console.log('getExtentFromUrl called with params:', paramsSearch);
    const params = new URLSearchParams(paramsSearch);
    const minLat = parseFloat(params.get('minlat'));
    const minLon = parseFloat(params.get('minlon'));
    const maxLat = parseFloat(params.get('maxlat'));
    const maxLon = parseFloat(params.get('maxlon'));

    // If all params are present and valid, return the extent
    if (!isNaN(minLat) && !isNaN(minLon) &&
        !isNaN(maxLat) && !isNaN(maxLon)) {
        return [
            Math.min(minLon, maxLon), // minLon
            Math.min(minLat, maxLat), // minLat
            Math.max(minLon, maxLon), // maxLon
            Math.max(minLat, maxLat) // maxLat
        ];
    }
    // Otherwise, return null or your default
    return null;
}
export function getMapRotationDegrees(paramsSearch) {
    const params = new URLSearchParams(paramsSearch);
    const maprotation = parseFloat(params.get('maprotation'));
    return isNaN(maprotation) ? 0 : maprotation;
}
export function getProjectName(paramsSearch) {
    const params = new URLSearchParams(paramsSearch);
    const projectname = parseFloat(params.get('projectname'));
    return isNaN(maprotation) ? 0 : maprotation;
}