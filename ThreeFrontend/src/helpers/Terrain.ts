export class BoxTerrainItem {
    data: Float32Array;

    constructor(data: Float32Array) {
        this.data = data;
    }

    px = () => this.data[0];
    py = () => this.data[1];
    pz = () => this.data[2];

    sx = () => this.data[3];
    sy = () => this.data[4];
    sz = () => this.data[5];

    qx = () => this.data[6];
    qy = () => this.data[7];
    qz = () => this.data[8];
    qw = () => this.data[9];
}