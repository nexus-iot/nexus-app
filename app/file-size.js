module.exports = function(bytes, precision) {
    if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
    if (typeof precision === 'undefined') precision = 1;

    if(bytes == 0){
        return '0&nbsp;bytes';
    }
    var units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB'],
    number = Math.floor(Math.log(bytes) / Math.log(1024));

    if (number < 3) { // we don't display decimals for at least GB size files
        precision = 0;
    }
    return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  '&nbsp;' + units[number];
};
