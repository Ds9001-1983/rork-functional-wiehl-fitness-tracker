import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default protectedProcedure
  .query(async () => {
    return storage.challenges.getActive();
  });
