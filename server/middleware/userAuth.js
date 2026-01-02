import jwt from "jsonwebtoken";

const userAuth = async (req, res, next) => {
    const {token} = req.cookies;

    if(!token){
        return res.json({success:false, message:"Unauthorized access, no token"});
    }

    try {

      const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);

      if(tokenDecode.id){
        req.user = { userId: tokenDecode.id };
      }else{
        return res.json({success:false, message:"Unauthorized access, invalid token"});
      }

      next();

    } catch (error) {
        res.json({success:false, message:error.message});
        
    }
}

export default userAuth;