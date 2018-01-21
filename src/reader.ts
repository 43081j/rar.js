export abstract class Reader {
  public size: number = 0;

  public abstract open(): Promise<void>;
  public abstract close(): Promise<void>;
  public abstract read(length: number, position: number): Promise<ArrayBuffer>;
  public abstract reset(): void;

  public async readBlob(length: number, position: number, blobType?: string): Promise<Blob> {
    if (!blobType) {
      blobType = 'application/octet-stream';
    }

    const data = this.read(length, position);

    return new Blob([data], { type: blobType });
  }
}
