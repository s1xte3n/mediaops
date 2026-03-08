import { IsString, IsNotEmpty, IsMimeType, MaxLength } from 'class-validator';

export class CreateMediaDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    filename: string;

    @IsString()
    @IsMimeType()
    contentType: string;
}