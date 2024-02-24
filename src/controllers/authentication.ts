import express from "express";
import { createUser, getUserByEmail } from "../db/users";
import { authentication, random } from "../helpers";

export const login = async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.sendStatus(400);
    }

    const user = await getUserByEmail(email).select(
      "+authentication.salt +authentication.password"
    );

    if (!user) {
      return res.sendStatus(400);
    }

    const expectedHash = authentication(user.authentication.salt, password);

    if (user.authentication.password != expectedHash) {
      return res.sendStatus(403);
    }

    const salt = random();
    user.authentication.sessionToken = authentication(
      salt,
      user._id.toString()
    );

    await user.save();

    res.cookie("TEST-AUTH", user.authentication.sessionToken, {
      domain: "localhost",
      path: "/",
    });

    return res.status(200).json(user).end();
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

export const register = async (req: express.Request, res: express.Response) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.sendStatus(400);
    }

    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      return res.sendStatus(400);
    }

    const salt = random();
    const user = await createUser({
      email,
      username,
      authentication: {
        salt,
        password: authentication(salt, password),
      },
    });

    return res.status(200).json(user).end();
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};

// 클라이언트로부터 받은 요청(req)의 body에서 이메일, 비밀번호, 사용자 이름을 추출합니다.
// 만약 이메일, 비밀번호, 사용자 이름 중 하나라도 누락된 경우, 상태 코드 400을 반환하고 요청을 거부합니다.
// 이메일을 이용하여 이미 등록된 사용자인지 확인합니다. 이미 등록된 사용자라면 상태 코드 400을 반환하고 요청을 거부합니다.
// 등록된 사용자가 아닌 경우, 무작위 솔트를 생성하고 비밀번호를 인증 함수를 사용하여 해싱합니다.
// 생성된 사용자 정보(이메일, 사용자 이름, 인증 정보)를 데이터베이스에 저장합니다.
// 성공적으로 등록된 경우, 상태 코드 200과 함께 사용자 정보를 JSON 형식으로 반환합니다.
