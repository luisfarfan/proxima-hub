import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { BusinessContextService } from '../auth/business-context.service';

export const businessGuard: CanActivateFn = () => {
  const businessContext = inject(BusinessContextService);
  const router = inject(Router);

  if (businessContext.businessId()) {
    return true;
  }

  return router.parseUrl('/elegir-negocio');
};
