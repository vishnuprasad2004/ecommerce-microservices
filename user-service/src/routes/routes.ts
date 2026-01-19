import { Router } from "express";
import { 
  createUser, 
  deleteUserById, 
  getAllUsersWithPagination, 
  getUserCredentialsById, 
  getUserInfoById, 
  updateUserInfoById 
} from "../controllers/user.controller.js";
import { 
  addAddressForUserById, 
  deleteAddressById, 
  getAddressById, 
  getAddressesByUserId 
} from "../controllers/address.controller.js";

const router = Router();

router.get("/", getAllUsersWithPagination);
router.get("/address/:addressId", getAddressById);
router.get("/:id", getUserInfoById);
router.get("/:id/credentials", getUserCredentialsById);

router.get("/:userId/addresses", getAddressesByUserId);



router.post("/", createUser);
router.post("/:userId/addresses", addAddressForUserById);

router.put("/:id", updateUserInfoById);

router.delete("/:id", deleteUserById);
router.delete("/:userId/addresses/:addressId", deleteAddressById);

export default router;