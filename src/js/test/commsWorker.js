function Queue() {
    this.data = [];
}
Queue.prototype.add = function (record) {
    this.data.unshift(record);
}
Queue.prototype.remove = function () {
    return this.data.pop();
}
Queue.prototype.first = function () {
    return this.data[0];
}
Queue.prototype.last = function () {
    return this.data[this.data.length - 1];
}
Queue.prototype.size = function () {
    return this.data.length;
}

const q = new Queue();

console.log(q);
console.log(`Size of the Queue: ${q.size()}`)