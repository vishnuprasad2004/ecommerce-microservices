import { Request, Response } from "express";
import { db } from "../db.js";
import { address, users } from "../schema.js";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcrypt";
// get user info by ID
// get all available users
// create new user
// update user info by ID
// delete user by ID -> soft delete

// add billing info for user by ID
// delete billing info for user by billing info ID and user ID




const UNIQUE_VIOLATION_CODE = "23505"; // PostgreSQL error code for unique violation


/**
 * Fetch user information by ID
 * GET users/:id
 */
export const getUserInfoById = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id as string;

    // get full user infor with address and billing info
    const user = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        emailVerified: users.emailVerified,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isDeleted, false)))
      .limit(1);

    if (!user || user.length === 0) {
      return res.status(404).json({
        message: "User not found",
        status: "error",
      });
    }

    const addressList = await db
      .select()
      .from(address)
      .where(eq(address.userId, userId));  
      
    // const billingInfoList = await db
    //   .select()
    //   .from(billingInfo)
    //   .where(eq(billingInfo.userId, userId));


    res.status(200).json({
      message: "User retrieved successfully",
      status: "success",
      data: {...user[0], addresses: addressList },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal Server Error",
      status: "error",
      trace: error,
    });
  }
};


/**
 * Fetch user credentials (email and phone) by ID
 * GET users/:id/credentials
*/
export const getUserCredentialsById = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id as string;
    const user = await db
      .select({
        email: users.email,
        phone: users.phone,
      })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isDeleted, false)))
      .limit(1);
    if (!user || user.length === 0) {
      return res.status(404).json({
        message: "User not found",
        status: "error",
      });
    } 

    res.status(200).json({
      message: "User credentials retrieved successfully",
      status: "success",
      data: user[0],
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error", status: "error", trace: error });
  }
};

/**
 * Fetch all users with pagination
 * GET users?page=1&limit=10
 */
export const getAllUsersWithPagination = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        emailVerified: users.emailVerified,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.isDeleted, false))
      .limit(limit)
      .offset(offset);

    res.status(200).json({
      message: "Users retrieved successfully",
      status: "success",
      data: allUsers,
      pagination: { page, limit },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal Server Error",
      status: "error",
      trace: error,
    });
  }
};

/**
 * Create a new user
 * POST /users 
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        message: "Name, email, password, and phone are required",
        status: "error",
      });
    }
    
    // validations for email format, phone format, 
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: "Invalid email format",
        status: "error",
      });
    }

    if(!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        message: "Invalid phone format. It should be 10 digits.",
        status: "error",
      });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashedPassword,
        phone,
        role: role || 1,
      })
      .returning(); // returning the inserted record

    res.status(201).json({
      message: "User created successfully",
      status: "success",
      data: newUser,
    });
  } catch (error: any) {
    console.error(error);
    if (error.code === UNIQUE_VIOLATION_CODE) {
      // unique violation
      return res.status(409).json({
        message: "Email or phone already exists",
        status: "error",
      });
    }
    res.status(500).json({
      message: "Internal Server Error",
      status: "error",
      trace: error,
    });
  }
};


/**
 * Update the info of a user
 * PUT /users/:id 
 */
export const updateUserInfoById = async (req: Request, res:Response) => {
  try {
    const userId = req.params.id as string;
    const { name, email, phone } = req.body;

    // validations for email format, phone format, 
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: "Invalid email format",
        status: "error",
      });
    }

    if(!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        message: "Invalid phone format. It should be 10 digits.",
        status: "error",
      });
    }



    const updatedUser = await db
      .update(users)
      .set({
        name,
        phone,
        email,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    if (updatedUser.length === 0) {
      return res.status(404).json({
        message: "User not found",
        status: "error",
      });
    }

    res.status(200).json({
      message: "User updated successfully",
      status: "success",
      data: updatedUser,
    });

  } catch(error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error", status: "error", trace: error });
  }
}

/**
 * Delete user by ID (soft delete)
 * DELETE /users/:id
 */
export const deleteUserById = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id as string;
  
    const deletedUser = await db
      .update(users)
      .set({ isDeleted: true })
      .where(eq(users.id, userId))
      .returning({ userId: users.id });
    
    if (deletedUser.length === 0) {
      return res.status(404).json({
        message: "User not found",
        status: "error",
      });
    }
    res.status(200).json({
      message: "User deleted successfully",
      status: "success",
      data: deletedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error", status: "error", trace: error });
  } 
};