import { RarMethod } from './method';

export class RarEntry {
  public name: string | null = null;
  public path: string | null = null;
  public size: number = 0;
  public sizePacked: number = 0;
  public crc: number | null = null;
  public offset: number = 0;
  public blockSize: number = 0;
  public headerSize: number = 0;
  public encrypted: boolean = false;
  public version: number | null = null;
  public time: Date | null = null;
  public method: RarMethod | null = null;
  public os: string | null = null;
  public partial: boolean = false;
  public continuesFrom: boolean = false;
  public continues: boolean = false;
}
