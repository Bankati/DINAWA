import { BadRequestException } from '@nestjs/common';
import { createMimeTypeFilter } from './mime-type-filter';

describe('createMimeTypeFilter', () => {
  function makeFile(mimetype: string): Express.Multer.File {
    return { mimetype } as Express.Multer.File;
  }

  it('accepte un type MIME autorisé pour le bucket', () => {
    const filter = createMimeTypeFilter('property-photos');
    const callback = jest.fn();

    filter?.(undefined, makeFile('image/jpeg'), callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('rejette un type MIME non autorisé — jamais après bufferisation, ici avant même le service', () => {
    const filter = createMimeTypeFilter('property-photos');
    const callback = jest.fn();

    filter?.(undefined, makeFile('application/pdf'), callback);

    const [error, acceptFile] = callback.mock.calls[0] as [BadRequestException, boolean];
    expect(error).toBeInstanceOf(BadRequestException);
    expect(acceptFile).toBe(false);
  });

  it('autorise le PDF pour le bucket property-documents mais pas pour property-photos', () => {
    const documentsFilter = createMimeTypeFilter('property-documents');
    const photosFilter = createMimeTypeFilter('property-photos');
    const documentsCallback = jest.fn();
    const photosCallback = jest.fn();

    documentsFilter?.(undefined, makeFile('application/pdf'), documentsCallback);
    photosFilter?.(undefined, makeFile('application/pdf'), photosCallback);

    expect(documentsCallback).toHaveBeenCalledWith(null, true);
    const [photosError, photosAccept] = photosCallback.mock.calls[0] as [
      BadRequestException,
      boolean,
    ];
    expect(photosError).toBeInstanceOf(BadRequestException);
    expect(photosAccept).toBe(false);
  });
});
