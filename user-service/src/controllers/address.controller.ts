import { Request, Response } from "express";
import { db } from "../db.js";
import { address } from "../schema.js";
import { and, eq } from "drizzle-orm";

// get all the available addresses for user by ID
// add new address for user by ID
// delete address for user by address ID and user ID

const CHECK_VIOLATION_CODE = "23514"; // PostgreSQL error code for check constraint violation


/**
  * Fetch address by address ID
  * GET users/address/:addressId
  */
export const getAddressById = async (req: Request, res: Response) => {
  try { 
    const addressId = req.params.addressId as string;
    const addr = await db
      .select()
      .from(address)
      .where(eq(address.id, addressId))
      .limit(1);
    if (addr.length === 0) {
      return res.status(404).json({
        message: "Address not found",
        status: "error",
      });
    }
    res.status(200).json({
      message: "Address retrieved successfully",
      status: "success",
      data: addr[0],
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error", status: "error", trace: error });
  }
};



/**
  * Fetch all addresses for a user by user ID
  * GET users/:id/addresses
 */
export const getAddressesByUserId = async (req: Request, res: Response) => {
  try { 
    const userId = req.params.userId as string;

    const addresses = await db
      .select()
      .from(address)
      .where(eq(address.userId, userId));

    res.status(200).json({
      message: "Addresses retrieved successfully",
      status: "success",
      data: addresses,
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error", status: "error", trace: error });
  }
};

/**
 * Add new address for user by ID
 * POST users/:id/addresses
 */
export const addAddressForUserById = async (req: Request, res: Response) => {
  try { 
    const userId = req.params.userId as string;
    
    const { street, city, state, zipCode } = req.body;
    if (!userId || !street || !city || !state || !zipCode) {
      return res.status(400).json({
        message: "All address fields are required",
        status: "error",
      });
    }
    // zip code format will be validated by DB check constraint
    const newAddress = await db
      .insert(address)
      .values({
        userId,
        street,
        city,
        state,
        zipCode,
      })
      .returning();

    res.status(201).json({
      message: "Address added successfully",
      status: "success",
      data: newAddress,
    });
    
  } catch (error:any) {
    console.log(error);

    // handle zip code check constraint violation
    if (error.code === CHECK_VIOLATION_CODE) {
      return res.status(400).json({
        message: "Invalid zip code format",
        status: "error",
      });
    }

    res.status(500).json({ message: "Internal Server Error", status: "error", trace: error });
  }
};

/**
 * Delete address by address ID and user ID
 * DELETE users/:userId/addresses/:addressId
 */
export const deleteAddressById = async (req: Request, res: Response) => {
  try { 
    const addressId = req.params.addressId as string;
    const userId = req.params.userId as string;


    const deletedAddress = await db
      .delete(address)
      .where(
        and(eq(address.id, addressId), eq(address.userId, userId))
      )
      .returning();

    if (deletedAddress.length === 0) {
      return res.status(404).json({
        message: "Address not found",
        status: "error",
      });
    }

    res.status(200).json({
      message: "Address deleted successfully",
      status: "success",
      data: deletedAddress,
    });
  
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error", status: "error", trace: error });
  }
};